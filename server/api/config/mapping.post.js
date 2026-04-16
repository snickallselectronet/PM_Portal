// server/api/config/mapping.post.js
export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })
  const cfg  = useRuntimeConfig()
  const body = await readBody(event)

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation'
  }

  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/asset_mapping`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const err = await res.json()
    throw createError({ statusCode: 400, statusMessage: err.message || 'Failed to create mapping' })
  }

  return await res.json()
})