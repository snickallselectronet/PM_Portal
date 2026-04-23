// server/api/logs.get.js
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

  if (!logs.length) return logs

  // Get the ingest_log ids for all log entries
  const logIds = logs.map(l => l.id).filter(Boolean)

  // Find which log ids have at least one revision against them
  const revisedLogIds = new Set()
  if (logIds.length) {
    const revUrl = `${cfg.supabaseUrl}/rest/v1/work_order_revisions`
      + `?select=ingest_log_id`
      + `&ingest_log_id=in.(${logIds.map(id => `"${id}"`).join(',')})`
    const revRes = await fetch(revUrl, { headers })
    if (revRes.ok) {
      const revRows = await revRes.json()
      for (const r of revRows) {
        if (r.ingest_log_id) revisedLogIds.add(r.ingest_log_id)
      }
    }
  }

  return logs.map(log => ({
    ...log,
    has_revisions: revisedLogIds.has(log.id),
  }))
})