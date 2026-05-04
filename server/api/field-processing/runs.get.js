// server/api/field-processing/runs.get.js
// GET paginated list of runs for the log page (ADMIN only).

export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })
  const cfg    = useRuntimeConfig()
  const query  = getQuery(event)

  const limit  = parseInt(query.limit  || '100')
  const status = query.status || ''
  const woNum  = query.wo_num || ''

  let url = `${cfg.supabaseUrl}/rest/v1/field_processing_runs`
    + `?select=id,wo_num,status,error_message,received_at,sent_at,updated_at,attachments`
    + `&order=received_at.desc`
    + `&limit=${limit}`

  if (status) url += `&status=eq.${status}`
  if (woNum)  url += `&wo_num=eq.${woNum}`

  const res = await fetch(url, {
    headers: {
      'apikey':        cfg.supabaseSecretKey,
      'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
      'Accept':        'application/json',
    }
  })

  if (!res.ok) {
    const err = await res.json()
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to fetch runs' })
  }

  return await res.json()
})