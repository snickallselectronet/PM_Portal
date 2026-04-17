// server/api/field-processing/runs/[id].get.js
// GET full detail for a single run including revisions.

export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })
  const cfg = useRuntimeConfig()
  const id  = getRouterParam(event, 'id')

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Accept':        'application/json',
  }

  const [runRes, revRes] = await Promise.all([
    fetch(
      `${cfg.supabaseUrl}/rest/v1/field_processing_runs?id=eq.${id}&limit=1`,
      { headers }
    ),
    fetch(
      `${cfg.supabaseUrl}/rest/v1/field_processing_revisions?run_id=eq.${id}&order=changed_at.desc&limit=50`,
      { headers }
    )
  ])

  if (!runRes.ok) throw createError({ statusCode: 502, statusMessage: 'Failed to fetch run' })

  const rows = await runRes.json()
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Run not found' })

  const revisions = revRes.ok ? await revRes.json() : []

  return { ...rows[0], revisions }
})