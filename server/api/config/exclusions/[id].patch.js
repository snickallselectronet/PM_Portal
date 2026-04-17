// server/api/config/exclusions/[id].patch.js
export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })
  const cfg = useRuntimeConfig()
  const id  = getRouterParam(event, 'id')
  const body = await readBody(event)

  const allowed = ['attribute', 'note', 'is_active']
  const updates = { updated_at: new Date().toISOString() }
  for (const k of allowed) {
    if (k in body) updates[k] = body[k]
  }

  const res = await fetch(
    `${cfg.supabaseUrl}/rest/v1/field_processing_exclusions?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        'apikey':        cfg.supabaseSecretKey,
        'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation'
      },
      body: JSON.stringify(updates)
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw createError({ statusCode: 400, statusMessage: err.message || 'Failed to update exclusion' })
  }

  const data = await res.json()
  return Array.isArray(data) ? data[0] : data
})