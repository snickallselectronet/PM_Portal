// server/api/workorders/ingest.post.js
export default defineEventHandler(async (event) => {
  const cfg    = useRuntimeConfig()
  const secret = getHeader(event, 'x-ingest-secret')

  if (!secret || secret !== cfg.ingestSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid ingest secret' })
  }

  const raw = await readBody(event)

  if (!raw?.WONum) {
    await logIngest(cfg, {
      woNum:   null,
      source:  getHeader(event, 'x-source') || 'unknown',
      status:  'error',
      message: 'Missing WONum in request body',
      detail:  { body_keys: Object.keys(raw ?? {}) }
    })
    throw createError({ statusCode: 400, statusMessage: 'WONum is required' })
  }

  const woNum       = String(raw.WONum)
  const parentWoNum = String(raw.ParentWONum ?? '')
  const source      = getHeader(event, 'x-source') || 'unknown'
  const now         = new Date().toISOString()
  const receivedAt  = getHeader(event, 'x-received-at') || now

  let processed
  try {
    processed = processWorkOrder(raw)
  } catch (e) {
    await logIngest(cfg, {
      woNum, source, status: 'error',
      message: `Processing failed: ${e.message}`,
      detail:  { error: e.message, raw }
    })
    throw createError({ statusCode: 500, statusMessage: `Processing failed: ${e.message}` })
  }

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
    'Prefer':        'resolution=merge-duplicates,return=minimal',
  }

  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/work_orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      wo_num:         woNum,
      parent_wo_num:  parentWoNum,
      raw_data:       raw,
      processed_data: processed,
      status:         'RECEIVED',
      is_edited:      false,
      received_at:    receivedAt,
      updated_at:     now,
    })
  })

  if (!res.ok) {
    const err = await res.text()
    await logIngest(cfg, {
      woNum, source, status: 'error',
      message: `Supabase save failed: ${res.status}`,
      detail:  { supabase_response: err, raw }
    })
    throw createError({ statusCode: 502, statusMessage: `Failed to save work order: ${err}` })
  }

  await logIngest(cfg, {
    woNum, source, status: 'success',
    message: `WO ${woNum} ingested successfully`,
    detail:  raw
  })

  return { success: true, wo_num: woNum, received_at: receivedAt }
})