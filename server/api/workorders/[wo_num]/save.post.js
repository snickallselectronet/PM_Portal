// server/api/workorders/[wo_num]/save.post.js
// Saves edited raw_data, reprocesses to processed_data, saves revision with ingest_log_id,
// sets status = QUEUED ready for ArcGIS resend pipeline.

export default defineEventHandler(async (event) => {
  const user  = await requireAuth(event)
  const cfg   = useRuntimeConfig()
  const woNum = getRouterParam(event, 'wo_num')
  const body  = await readBody(event)

  if (!body?.raw_data) {
    throw createError({ statusCode: 400, statusMessage: 'raw_data is required' })
  }

  const newRaw      = typeof body.raw_data === 'string' ? JSON.parse(body.raw_data) : body.raw_data
  const ingestLogId = body.ingest_log_id ?? null  // uuid of the ingest_log entry this edit belongs to

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  }

  // Fetch current raw_data to store as previous value
  const currentRes = await fetch(
    `${cfg.supabaseUrl}/rest/v1/work_orders?select=raw_data&wo_num=eq.${encodeURIComponent(woNum)}&limit=1`,
    { headers }
  )
  const currentRows = await currentRes.json()
  if (!currentRows.length) {
    throw createError({ statusCode: 404, statusMessage: `Work order ${woNum} not found` })
  }

  const previousRaw  = currentRows[0].raw_data
  const now          = new Date().toISOString()
  const newProcessed = processWorkOrder(newRaw)

  // Save revision + update work order in parallel
  const [, updateRes] = await Promise.all([
    fetch(`${cfg.supabaseUrl}/rest/v1/work_order_revisions`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        wo_num:          woNum,
        field:           'raw_data',
        previous_value:  previousRaw,
        new_value:       newRaw,
        changed_by:      user.email,
        changed_at:      now,
        note:            body.note || null,
        ingest_log_id:   ingestLogId,
      })
    }),
    fetch(`${cfg.supabaseUrl}/rest/v1/work_orders?wo_num=eq.${encodeURIComponent(woNum)}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        raw_data:       newRaw,
        processed_data: newProcessed,
        is_edited:      true,
        status:         'QUEUED',
        updated_at:     now,
      })
    })
  ])

  if (!updateRes.ok) {
    const err = await updateRes.text()
    throw createError({ statusCode: 502, statusMessage: `Failed to update: ${err}` })
  }

  return { success: true, processed_data: newProcessed, updated_at: now }
})