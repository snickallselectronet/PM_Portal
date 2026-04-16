// server/api/config/mapping/[id].patch.js
export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event, { role: 'ADMIN' })
  const cfg      = useRuntimeConfig()
  const id       = event.context.params.id
  const body     = await readBody(event)
  const { note, ...fields } = body

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
    'Prefer':        'return=representation'
  }

  const currentRes = await fetch(
    `${cfg.supabaseUrl}/rest/v1/asset_mapping?id=eq.${id}`,
    { headers }
  )
  const current = await currentRes.json()
  if (!current?.length) throw createError({ statusCode: 404, statusMessage: 'Mapping not found' })

  await fetch(`${cfg.supabaseUrl}/rest/v1/asset_mapping_revisions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      asset_mapping_id: id,
      previous_value:   current[0],
      changed_by:       authUser.email,
      note:             note || null
    })
  })

  const updateRes = await fetch(
    `${cfg.supabaseUrl}/rest/v1/asset_mapping?id=eq.${id}`,
    { method: 'PATCH', headers, body: JSON.stringify(fields) }
  )

  if (!updateRes.ok) {
    const err = await updateRes.json()
    throw createError({ statusCode: 400, statusMessage: err.message || 'Failed to update mapping' })
  }

  return await updateRes.json()
})