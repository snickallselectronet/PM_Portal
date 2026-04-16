// server/api/config/index.get.js
export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })
  const cfg = useRuntimeConfig()

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Accept':        'application/json'
  }

  const [mappingsRes, formsRes] = await Promise.all([
    fetch(`${cfg.supabaseUrl}/rest/v1/asset_mapping?order=asset_class.asc,asset_name.asc&limit=200`, { headers }),
    fetch(`${cfg.supabaseUrl}/rest/v1/published_forms?order=form_name.asc`, { headers })
  ])

  if (!mappingsRes.ok || !formsRes.ok) {
    throw createError({ statusCode: 502, statusMessage: 'Failed to fetch config from Supabase' })
  }

  return {
    mappings: await mappingsRes.json(),
    forms:    await formsRes.json()
  }
})