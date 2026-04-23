// server/utils/arcgisToken.js
// Shared ArcGIS token utility using client credentials OAuth flow.
// Token is cached in-memory and renewed 60s before expiry.
// Nitro auto-imports named exports from server/utils/ — no import needed in routes.

let tokenCache = { token: null, expires: 0 }

export async function getArcGISToken(cfg) {
  // Return cached token if still valid
  if (tokenCache.token && Date.now() < tokenCache.expires) {
    return tokenCache.token
  }

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
    throw new Error(`ArcGIS token request failed: ${res.status}`)
  }

  const data = await res.json()

  if (data.error) {
    throw new Error(`ArcGIS token error: ${data.error.message ?? JSON.stringify(data.error)}`)
  }

  // Cache token, expire 60s early to avoid edge cases
  tokenCache.token   = data.access_token
  tokenCache.expires = Date.now() + (data.expires_in * 1000) - 60_000

  return tokenCache.token
}