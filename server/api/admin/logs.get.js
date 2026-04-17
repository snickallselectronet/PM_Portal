// server/api/admin/logs.get.js
export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })
  const cfg = useRuntimeConfig()

  const query  = getQuery(event)
  const limit  = Math.min(parseInt(query.limit) || 100, 500)
  const status = query.status
  const source = query.source
  const woNum  = query.wo_num

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Accept':        'application/json',
  }

  // Fetch logs
  let url = `${cfg.supabaseUrl}/rest/v1/ingest_log`
    + `?order=logged_at.desc&limit=${limit}`
  if (status) url += `&status=eq.${status}`
  if (source) url += `&source=eq.${source}`
  if (woNum)  url += `&wo_num=eq.${woNum}`

  const res = await fetch(url, { headers })
  if (!res.ok) throw createError({ statusCode: 502, statusMessage: 'Failed to fetch logs' })
  const logs = await res.json()

  // Get distinct WO nums that have revisions
  const woNums = [...new Set(logs.map(l => l.wo_num).filter(Boolean))]

  let revisedWoNums = new Set()
  if (woNums.length) {
    const revUrl = `${cfg.supabaseUrl}/rest/v1/work_order_revisions`
      + `?select=wo_num`
      + `&wo_num=in.(${woNums.map(w => `"${w}"`).join(',')})`
    const revRes = await fetch(revUrl, { headers })
    if (revRes.ok) {
      const revRows = await revRes.json()
      revisedWoNums = new Set(revRows.map(r => r.wo_num))
    }
  }

  // Annotate logs with has_revisions flag
  return logs.map(log => ({
    ...log,
    has_revisions: log.wo_num ? revisedWoNums.has(log.wo_num) : false,
  }))
})