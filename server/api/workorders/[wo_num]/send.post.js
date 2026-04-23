// server/api/workorders/[wo_num]/send.post.js
// Reads arcgis_payload, runs 3-pass ArcGIS creation, saves result.
// Sets status = SENT on success, ERROR on failure.
// Admin only.
import { sendToArcGIS } from '~/server/utils/sendToArcGIS'

export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })
  const cfg   = useRuntimeConfig()
  const woNum = getRouterParam(event, 'wo_num')

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
    'Prefer':        'return=minimal',
  }

  // ── Fetch arcgis_payload ──────────────────────────────────────────────────
  const woRes = await fetch(
    `${cfg.supabaseUrl}/rest/v1/work_orders?select=arcgis_payload,arcgis_form&wo_num=eq.${encodeURIComponent(woNum)}&limit=1`,
    { headers }
  )
  const rows = await woRes.json()
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: `Work order ${woNum} not found` })

  const payload = rows[0].arcgis_payload
  if (!payload) throw createError({ statusCode: 400, statusMessage: 'No arcgis_payload — run /process first' })

  // ── Run 3-pass send ───────────────────────────────────────────────────────
  const { success, runLogs, arcgisObjectId, arcgisRun, error } = await sendToArcGIS(payload, cfg)

  const now = new Date().toISOString()

  if (success) {
    await fetch(`${cfg.supabaseUrl}/rest/v1/work_orders?wo_num=eq.${encodeURIComponent(woNum)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status:           'SENT',
        arcgis_object_id: arcgisObjectId,
        arcgis_form:      payload.FormServiceLayer,
        arcgis_run:       arcgisRun ?? null,
        error_message:    null,
        updated_at:       now,
      })
    })
  } else {
    await fetch(`${cfg.supabaseUrl}/rest/v1/work_orders?wo_num=eq.${encodeURIComponent(woNum)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status:        'ERROR',
        error_message: error,
        updated_at:    now,
      })
    })
  }

  return { success, runLogs, arcgisObjectId: arcgisObjectId ?? null, arcgisRun: arcgisRun ?? null, error: error ?? null }
})