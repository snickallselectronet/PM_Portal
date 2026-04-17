// server/api/config/exclusions.get.js
export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })
  const cfg = useRuntimeConfig()

  const res = await fetch(
    `${cfg.supabaseUrl}/rest/v1/field_processing_exclusions?select=*&order=attribute.asc`,
    {
      headers: {
        'apikey':        cfg.supabaseSecretKey,
        'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
        'Accept':        'application/json'
      }
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to fetch exclusions' })
  }

  return await res.json()
})