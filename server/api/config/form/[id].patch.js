// server/api/config/form/[id].patch.js
export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })
  const cfg  = useRuntimeConfig()
  const id   = event.context.params.id
  const body = await readBody(event)

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation'
  }

  const res = await fetch(
    `${cfg.supabaseUrl}/rest/v1/published_forms?id=eq.${id}`,
    { method: 'PATCH', headers, body: JSON.stringify(body) }
  )

  if (!res.ok) {
    const err = await res.json()
    throw createError({ statusCode: 400, statusMessage: err.message || 'Failed to update form' })
  }

  return await res.json()
})