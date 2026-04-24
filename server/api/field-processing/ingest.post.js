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
  const extracted = extractAttachments(raw)

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
    // Return 200 to Survey123 regardless — we don't want it retrying
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

  // Always return 200 so Survey123 doesn't retry
  return { success: true, run_id: runId, wo_num: woNum, status: 'PROCESSED' }
})