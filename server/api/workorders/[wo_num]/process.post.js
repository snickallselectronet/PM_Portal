// server/api/workorders/[wo_num]/process.post.js
// Builds the arcgis_payload for a work order and sets status = QUEUED.
// Admin only — can be triggered manually or called by the ingest pipeline.

export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })
  const cfg   = useRuntimeConfig()
  const woNum = getRouterParam(event, 'wo_num')
  const body  = await readBody(event).catch(() => null)

  // Optional: caller can pass raw_data to process a specific revision
  const rawOverride = body?.raw_data ?? null

  const { payload, runLogs, error, skipped } = await buildArcGISPayload(woNum, cfg, rawOverride)

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
    'Prefer':        'return=minimal',
  }

  const now = new Date().toISOString()

  if (skipped) {
    await fetch(`${cfg.supabaseUrl}/rest/v1/work_orders?wo_num=eq.${encodeURIComponent(woNum)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'SKIPPED', updated_at: now })
    })
    return { success: true, skipped: true, runLogs }
  }

  if (error) {
    await fetch(`${cfg.supabaseUrl}/rest/v1/work_orders?wo_num=eq.${encodeURIComponent(woNum)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'ERROR', error_message: error, updated_at: now })
    })
    throw createError({ statusCode: 422, statusMessage: error })
  }

  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/work_orders?wo_num=eq.${encodeURIComponent(woNum)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      arcgis_payload: payload,
      status:         'QUEUED',
      error_message:  null,
      updated_at:     now,
    })
  })

  if (!res.ok) {
    const err = await res.text()
    throw createError({ statusCode: 502, statusMessage: `Failed to save payload: ${err}` })
  }

  return { success: true, skipped: false, payload, runLogs }
})