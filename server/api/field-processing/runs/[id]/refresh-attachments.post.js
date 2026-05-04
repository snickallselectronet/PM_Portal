// server/api/field-processing/runs/[id]/refresh-attachments.post.js
// Re-queries the ArcGIS Feature Service for attachments on a given run.
// Uses a FRESH CLIENT CREDENTIALS TOKEN via getArcGISToken() — not the stored
// webhook token, which will have expired by the time this is called manually.

export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })
  const cfg = useRuntimeConfig()
  const id  = getRouterParam(event, 'id')

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  }

  // Fetch the stored raw Survey123 input — need OBJECTID and serviceUrl
  const runRes = await fetch(
    `${cfg.supabaseUrl}/rest/v1/field_processing_runs?select=survey123_input&id=eq.${id}&limit=1`,
    { headers }
  )
  if (!runRes.ok) throw createError({ statusCode: 502, statusMessage: 'Failed to fetch run' })

  const rows = await runRes.json()
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Run not found' })

  const raw = rows[0].survey123_input
  if (!raw) throw createError({ statusCode: 400, statusMessage: 'No survey123_input on this run' })

  const logger = {
    lines: [],
    log(msg) { this.lines.push(msg); console.log('[RefreshAttachments]', msg) },
  }

  // Get a fresh client credentials token — the webhook token is expired
  logger.log('Getting fresh ArcGIS token via client credentials...')
  let freshToken
  try {
    freshToken = await getArcGISToken(cfg)
    logger.log('Fresh token obtained.')
  } catch (e) {
    logger.log(`Failed to get ArcGIS token: ${e.message}`)
    throw createError({ statusCode: 502, statusMessage: `ArcGIS token error: ${e.message}` })
  }

  const objectId   = raw?.feature?.attributes?.OBJECTID
  const serviceUrl = raw?.surveyInfo?.serviceUrl
  logger.log(`Querying attachments for OBJECTID ${objectId} at ${serviceUrl}`)

  // Query the service with the fresh token
  let extracted = await fetchAttachmentsFromService(raw, freshToken, logger)

  // If service query found nothing, also check the webhook payload body as a cross-check
  if (!extracted.hasAttachments) {
    logger.log('Service query returned 0 — also checking stored webhook payload body...')
    const payloadResult = extractAttachments(raw)
    if (payloadResult.hasAttachments) {
      logger.log(
        `Webhook payload body contains ${payloadResult.attachments.length} photo(s) and ` +
        `${payloadResult.signatures.length} signature(s) — using payload result. ` +
        `Note: stored payload URLs may require the original webhook token to view.`
      )
      extracted = payloadResult
    } else {
      logger.log('Webhook payload body also has 0 attachments.')
    }
  }

  // Store the fresh token on the result so the UI can use it for viewing
  extracted = { ...extracted, arcgisToken: freshToken }

  logger.log(
    `Result (source: ${extracted.source}): ` +
    `${extracted.attachments.length} photo(s), ${extracted.signatures.length} signature(s), ` +
    `hasAttachments=${extracted.hasAttachments}.`
  )

  // Update the run's attachments column
  const updateRes = await fetch(
    `${cfg.supabaseUrl}/rest/v1/field_processing_runs?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        attachments: extracted,
        updated_at:  new Date().toISOString(),
      })
    }
  )

  if (!updateRes.ok) {
    const err = await updateRes.text()
    throw createError({ statusCode: 502, statusMessage: `Failed to update attachments: ${err}` })
  }

  return {
    success:        true,
    hasAttachments: extracted.hasAttachments,
    attachments:    extracted.attachments.length,
    signatures:     extracted.signatures.length,
    source:         extracted.source,
    logs:           logger.lines,
  }
})