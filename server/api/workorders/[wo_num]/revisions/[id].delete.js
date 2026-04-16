// server/api/workorders/[wo_num]/revisions/[id].delete.js
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const cfg   = useRuntimeConfig()
  const woNum = getRouterParam(event, 'wo_num')
  const id    = getRouterParam(event, 'id')

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Prefer':        'return=minimal',
  }

  const res = await fetch(
    `${cfg.supabaseUrl}/rest/v1/work_order_revisions?id=eq.${encodeURIComponent(id)}&wo_num=eq.${encodeURIComponent(woNum)}`,
    { method: 'DELETE', headers }
  )

  if (!res.ok) throw createError({ statusCode: 502, statusMessage: 'Failed to delete revision' })

  return { success: true }
})