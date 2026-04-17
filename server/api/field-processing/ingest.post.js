// server/api/field-processing/ingest.post.js
// Receives Survey123 webhook payload, processes field data, fetches attachments
// as base64, then sends everything to Power Automate.

export default defineEventHandler(async (event) => {
  const cfg    = useRuntimeConfig()
  const secret = getHeader(event, 'x-ingest-secret')

  if (!secret || secret !== cfg.ingestSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid ingest secret' })
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

  // ── Step 1: Extract attachment metadata from raw payload ──────────────────
  const extracted = extractAttachments(raw)

  // ── Step 2: Insert run record with RECEIVED status ────────────────────────
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

  // ── Step 3: Process the field data ───────────────────────────────────────
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

  // If processing failed, save ERROR and return early
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
    return { success: false, run_id: runId, wo_num: woNum, status: 'ERROR', error: processingError }
  }

  // ── Step 4: Save PROCESSED state ─────────────────────────────────────────
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

  // ── Step 5: Auto-send to Power Automate ───────────────────────────────────
  const paUrl = cfg.paWebhookUrl || null

  if (!paUrl) {
    runLogs.push('Warning: PA_WEBHOOK_URL not configured — skipping auto-send')
    await fetch(`${cfg.supabaseUrl}/rest/v1/field_processing_runs?id=eq.${runId}`, {
      method: 'PATCH',
      headers: { ...dbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ run_logs: runLogs, updated_at: now })
    })
    return { success: true, run_id: runId, wo_num: woNum, status: 'PROCESSED' }
  }

  // ── Step 6: Fetch attachments as base64 ───────────────────────────────────
  const logger = { log: (msg) => { runLogs.push(msg); console.log('[Attachments]', msg) }, lines: runLogs }
  const encodedFiles = await fetchAttachmentsAsBase64(extracted, cfg, logger)

  // Build wrapped PA payload — data untouched, attachments encoded
  const paPayload = {
    data:        result,
    attachments: encodedFiles.attachments,
    signatures:  encodedFiles.signatures,
  }

  let paResponse, paError, finalStatus
  const sentAt = new Date().toISOString()

  try {
    const paRes = await fetch(paUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(paPayload),
    })

    const contentType = paRes.headers.get('content-type') || ''
    let paBody = null
    if (contentType.includes('application/json')) {
      paBody = await paRes.json()
    } else {
      const text = await paRes.text()
      paBody = text ? { raw: text } : { raw: '' }
    }

    paResponse  = paBody
    finalStatus = paRes.ok ? 'SENT' : 'ERROR'
    paError     = paRes.ok ? null : `PA returned ${paRes.status}`
  } catch (e) {
    paResponse  = { error: e.message }
    finalStatus = 'ERROR'
    paError     = e.message
  }

  // ── Step 7: Save final status + PA response + updated run logs ────────────
  await fetch(`${cfg.supabaseUrl}/rest/v1/field_processing_runs?id=eq.${runId}`, {
    method: 'PATCH',
    headers: { ...dbHeaders, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      run_logs:      runLogs,
      status:        finalStatus,
      pa_response:   paResponse,
      error_message: paError,
      sent_at:       finalStatus === 'SENT' ? sentAt : null,
      updated_at:    sentAt,
    })
  })

  return {
    success:     finalStatus === 'SENT',
    run_id:      runId,
    wo_num:      woNum,
    status:      finalStatus,
    pa_response: paResponse,
    error:       paError ?? null,
  }
})