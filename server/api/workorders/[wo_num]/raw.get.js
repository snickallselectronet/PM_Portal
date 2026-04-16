// server/api/workorders/[wo_num]/raw.get.js
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const cfg   = useRuntimeConfig()
  const woNum = getRouterParam(event, 'wo_num')

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Accept':        'application/json',
  }

  const url = `${cfg.supabaseUrl}/rest/v1/work_orders`
    + `?select=raw_data`
    + `&wo_num=eq.${encodeURIComponent(woNum)}`
    + `&limit=1`

  const res = await fetch(url, { headers })

  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: 'Failed to fetch from Supabase' })
  }

  const rows = await res.json()

  if (!rows.length) {
    throw createError({ statusCode: 404, statusMessage: `Work order ${woNum} not found` })
  }

  return { raw_data: rows[0].raw_data }
})