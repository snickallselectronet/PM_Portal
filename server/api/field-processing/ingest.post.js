// server/api/field-processing/ingest.post.js

export default defineEventHandler(async (event) => {
  const cfg    = useRuntimeConfig()
  const query  = getQuery(event)
  const secret = query.secret

  if (!secret || secret !== cfg.ingestSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid secret' })
  }

  const raw = await readBody(event)
  const now = new Date().toISOString()

  const dbHeaders = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
    'Prefer':        'return=representation',
  }

  // ── Step 1: Extract attachment metadata ───────────────────────────────────
  // Two known Survey123 webhook behaviours (confirmed from real payloads):
  //
  // CASE A — raw.feature.attachments present:
  //   Survey123 includes full attachment objects with URLs inline.
  //   extractAttachments() handles this — fast, no extra network call.
  //
  // CASE B — raw.feature.attachments absent:
  //   Survey123 omits the key entirely even when attachments exist in ArcGIS.
  //   fetchAttachmentsFromService() queries the Feature Service directly.
  //   At ingest time the webhook token (raw.portalInfo.token) is still fresh
  //   so we use that. A fresh client credentials token is used for manual
  //   refreshes later via the refresh-attachments endpoint.

  const attachmentLogger = {
    lines: [],
    log(msg) { this.lines.push(msg); console.log('[AttachmentIngest]', msg) },
  }

  // Try payload first (Case A)
  let extracted = extractAttachments(raw)
  attachmentLogger.log(
    `Payload extraction (source: ${extracted.source}): ` +
    `${extracted.attachments.length} photo(s), ${extracted.signatures.length} signature(s).`
  )

  // If absent or empty, fall back to service query using the webhook token (Case B)
  if (!extracted.hasAttachments) {
    const webhookToken = raw?.portalInfo?.token ?? null

    attachmentLogger.log(
      extracted.source === 'webhook_payload_absent'
        ? `Attachment key absent from webhook payload — querying ArcGIS Feature Service for OBJECTID ${raw?.feature?.attributes?.OBJECTID}...`
        : 'Payload attachments empty — querying ArcGIS Feature Service as fallback.'
    )

    const serviceResult = await fetchAttachmentsFromService(raw, webhookToken, attachmentLogger)

    if (serviceResult.hasAttachments) {
      attachmentLogger.log(
        `Service query found ${serviceResult.attachments.length} photo(s) and ` +
        `${serviceResult.signatures.length} signature(s) — using service result.`
      )
      // Preserve the webhook token for viewing — store it on the result
      extracted = { ...serviceResult, arcgisToken: webhookToken }
    } else {
      attachmentLogger.log(
        'Service query also returned 0 attachments — confirmed no attachments on this submission, ' +
        'or webhook token has already expired. Use the Refresh button in the UI to re-check.'
      )
    }
  }

  attachmentLogger.log(
    `Final (source: ${extracted.source}): ` +
    `${extracted.attachments.length} photo(s), ${extracted.signatures.length} signature(s), ` +
    `hasAttachments=${extracted.hasAttachments}.`
  )

  // ── Step 2: Insert run record ─────────────────────────────────────────────
  const insertRes = await fetch(`${cfg.supabaseUrl}/rest/v1/field_processing_runs`, {
    method: 'POST',
    headers: dbHeaders,
    body: JSON.stringify({
      survey123_input: raw,
      attachments:     extracted,
      status:          'RECEIVED',
      received_at:     now,
      created_at:      now,
      updated_at:      now,
    })
  })

  if (!insertRes.ok) {
    const err = await insertRes.text()
    throw createError({ statusCode: 502, statusMessage: `Failed to create run record: ${err}` })
  }

  const insertData = await insertRes.json()
  const runId = Array.isArray(insertData) ? insertData[0].id : insertData.id

  // ── Step 3: Process field data ────────────────────────────────────────────
  let result, runLogs, processingError
  try {
    const outcome = await processFieldData(raw, {
      supabaseUrl:       cfg.supabaseUrl,
      supabaseSecretKey: cfg.supabaseSecretKey,
    })
    result          = outcome.result
    runLogs         = outcome.runLogs
    processingError = outcome.error || null
  } catch (e) {
    processingError = e.message
    runLogs         = [`Fatal error: ${e.message}`]
  }

  // Prepend attachment logs so they're visible in the UI Run Logs tab
  runLogs = [...attachmentLogger.lines, ...(runLogs ?? [])]

  const woNum = result?.WONum ?? null

  if (processingError) {
    await fetch(`${cfg.supabaseUrl}/rest/v1/field_processing_runs?id=eq.${runId}`, {
      method: 'PATCH',
      headers: { ...dbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        wo_num:        woNum,
        run_logs:      runLogs,
        status:        'ERROR',
        error_message: processingError,
        updated_at:    now,
      })
    })
    return { success: false, run_id: runId, status: 'ERROR', error: processingError }
  }

  await fetch(`${cfg.supabaseUrl}/rest/v1/field_processing_runs?id=eq.${runId}`, {
    method: 'PATCH',
    headers: { ...dbHeaders, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      wo_num:           woNum,
      processed_output: result,
      run_logs:         runLogs,
      status:           'PROCESSED',
      error_message:    null,
      updated_at:       now,
    })
  })

  return { success: true, run_id: runId, wo_num: woNum, status: 'PROCESSED' }
})