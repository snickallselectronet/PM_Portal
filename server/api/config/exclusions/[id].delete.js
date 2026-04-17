// server/api/config/exclusions/[id].delete.js
export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })
  const cfg = useRuntimeConfig()
  const id  = getRouterParam(event, 'id')

  const res = await fetch(
    `${cfg.supabaseUrl}/rest/v1/field_processing_exclusions?id=eq.${id}`,
    {
      method: 'DELETE',
      headers: {
        'apikey':        cfg.supabaseSecretKey,
        'Authorization': `Bearer ${cfg.supabaseSecretKey}`
      }
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw createError({ statusCode: 400, statusMessage: err.message || 'Failed to delete exclusion' })
  }

  return { success: true }
})