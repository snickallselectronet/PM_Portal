// server/api/admin/logs.get.js
export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })
  const cfg = useRuntimeConfig()

  const query  = getQuery(event)
  const limit  = Math.min(parseInt(query.limit) || 100, 500)
  const status = query.status  // optional: success | error | skipped
  const source = query.source  // optional filter
  const woNum  = query.wo_num  // optional filter

  let url = `${cfg.supabaseUrl}/rest/v1/ingest_log`
    + `?order=logged_at.desc&limit=${limit}`

  if (status) url += `&status=eq.${status}`
  if (source) url += `&source=eq.${source}`
  if (woNum)  url += `&wo_num=eq.${woNum}`

  const res = await fetch(url, {
    headers: {
      'apikey':        cfg.supabaseSecretKey,
      'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
      'Accept':        'application/json',
    }
  })

  if (!res.ok) throw createError({ statusCode: 502, statusMessage: 'Failed to fetch logs' })

  return await res.json()
})