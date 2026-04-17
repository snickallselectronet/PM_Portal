// server/api/config/exclusions.post.js
export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })
  const cfg = useRuntimeConfig()
  const { attribute, note } = await readBody(event)

  if (!attribute?.trim()) throw createError({ statusCode: 400, statusMessage: 'attribute is required' })

  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/field_processing_exclusions`, {
    method: 'POST',
    headers: {
      'apikey':        cfg.supabaseSecretKey,
      'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation'
    },
    body: JSON.stringify({ attribute: attribute.trim(), note: note || null })
  })

  if (!res.ok) {
    const err = await res.json()
    throw createError({ statusCode: 400, statusMessage: err.message || 'Failed to create exclusion' })
  }

  const data = await res.json()
  return Array.isArray(data) ? data[0] : data
})