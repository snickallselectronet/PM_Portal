// server/api/workorders/[wo_num]/data.get.js
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const cfg          = useRuntimeConfig()
  const woNum        = getRouterParam(event, 'wo_num')
  const { ingest_log_id } = getQuery(event)

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Accept':        'application/json',
  }

  // Build revisions URL — filter by ingest_log_id if provided, otherwise all for this WO.
  let revUrl = `${cfg.supabaseUrl}/rest/v1/work_order_revisions`
    + `?wo_num=eq.${encodeURIComponent(woNum)}`
    + `&field=eq.raw_data`
    + `&order=changed_at.desc`
    + `&limit=50`

  if (ingest_log_id) {
    revUrl += `&ingest_log_id=eq.${encodeURIComponent(ingest_log_id)}`
  }

  const [woRes, revRes] = await Promise.all([
    fetch(
      `${cfg.supabaseUrl}/rest/v1/work_orders?select=wo_num,raw_data,processed_data,arcgis_payload,arcgis_run,status,is_edited&wo_num=eq.${encodeURIComponent(woNum)}&limit=1`,
      { headers }
    ),
    fetch(revUrl, { headers })
  ])

  if (!woRes.ok) throw createError({ statusCode: 502, statusMessage: 'Failed to fetch work order' })

  const rows = await woRes.json()
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: `Work order ${woNum} not found` })

  const revisions = revRes.ok ? await revRes.json() : []

  return {
    wo_num:         rows[0].wo_num,
    raw_data:       rows[0].raw_data,
    processed_data: rows[0].processed_data,
    arcgis_payload: rows[0].arcgis_payload ?? null,
    arcgis_run:     rows[0].arcgis_run     ?? null,
    status:         rows[0].status,
    is_edited:      rows[0].is_edited,
    revisions,
  }
})