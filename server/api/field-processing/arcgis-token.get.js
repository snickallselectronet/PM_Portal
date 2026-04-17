// server/api/field-processing/arcgis-token.get.js
// Returns a fresh ArcGIS token using client credentials.
// Used by the frontend to generate valid View links for attachments.

export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })
  const cfg = useRuntimeConfig()

  const params = new URLSearchParams({
    client_id:     cfg.arcgisClientId,
    client_secret: cfg.arcgisClientSecret,
    grant_type:    'client_credentials',
    f:             'json',
  })

  const res = await fetch(cfg.arcgisTokenUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  })

  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: 'Failed to fetch ArcGIS token' })
  }

  const data = await res.json()

  if (data.error) {
    throw createError({ statusCode: 502, statusMessage: `ArcGIS token error: ${data.error.message}` })
  }

  return {
    token:      data.access_token,
    expires_in: data.expires_in, // seconds
  }
})