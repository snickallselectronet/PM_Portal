// server/api/field-processing/runs/[id]/send.post.js
// Manual send/resend to Power Automate.
// Fetches attachments as fresh base64 using client credentials each time.

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

  // Fetch the run — need processed_output and stored attachment metadata
  const runRes = await fetch(
    `${cfg.supabaseUrl}/rest/v1/field_processing_runs?select=processed_output,attachments&id=eq.${id}&limit=1`,
    { headers }
  )
  const rows = await runRes.json()
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Run not found' })

  const run = rows[0]
  if (!run.processed_output) {
    throw createError({ statusCode: 400, statusMessage: 'No processed output to send' })
  }

  const paUrl = cfg.paWebhookUrl || null
  if (!paUrl) {
    throw createError({ statusCode: 400, statusMessage: 'Power Automate webhook URL not configured' })
  }

  // Fetch attachments as fresh base64
  const extracted = run.attachments || { attachments: [], signatures: [], arcgisToken: null }
  const runLogs   = []
  const logger    = { log: (msg) => { runLogs.push(msg); console.log('[Attachments]', msg) } }
  const encodedFiles = await fetchAttachmentsAsBase64(extracted, cfg, logger)

  const paPayload = {
    data:        run.processed_output,
    attachments: encodedFiles.attachments,
    signatures:  encodedFiles.signatures,
  }

  const now = new Date().toISOString()
  let paResponse, paError, newStatus

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

    paResponse = paBody
    newStatus  = paRes.ok ? 'SENT' : 'ERROR'
    paError    = paRes.ok ? null : `PA returned ${paRes.status}`
  } catch (e) {
    paResponse = { error: e.message }
    newStatus  = 'ERROR'
    paError    = e.message
  }

  await fetch(`${cfg.supabaseUrl}/rest/v1/field_processing_runs?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      status:        newStatus,
      pa_response:   paResponse,
      error_message: paError,
      sent_at:       newStatus === 'SENT' ? now : null,
      updated_at:    now,
    })
  })

  return {
    success:     newStatus === 'SENT',
    status:      newStatus,
    pa_response: paResponse,
    error:       paError,
  }
})