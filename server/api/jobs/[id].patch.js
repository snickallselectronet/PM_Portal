// server/api/jobs-[id].patch.js
// Route: PATCH /api/jobs/:id
// Body: { source: 'WO_POLE'|'AURORA', progress: 'INPRG'|'COMP' }

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // ---- Params & body validation ----
  const idParam = getRouterParam(event, 'id')
  if (!idParam) {
    throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  }

  const OBJECTID = Number(idParam)
  if (!Number.isFinite(OBJECTID) || OBJECTID < 0) {
    throw createError({ statusCode: 400, statusMessage: 'id must be a positive number (OBJECTID)' })
  }

  const body = await readBody(event)
  const source = (body?.source || '').toString().toUpperCase()
  const progress = (body?.progress || '').toString().toUpperCase()

  if (!source || !progress) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields: source and progress' })
  }
  if (!['WO_POLE', 'AURORA'].includes(source)) {
    throw createError({ statusCode: 400, statusMessage: `Unknown source: ${source}` })
  }
  if (!['INPRG', 'COMP'].includes(progress)) {
    throw createError({ statusCode: 400, statusMessage: 'Progress must be either INPRG or COMP' })
  }

  // ---- Build target URL ----
  // Expecting config.arcgis*Url to point at a FeatureServer layer query endpoint, e.g. .../FeatureServer/0/query
  // We need updateFeatures: .../FeatureServer/0/updateFeatures
  const layerQueryUrl = source === 'WO_POLE' ? config.arcgisWoPoleUrl : config.arcgisAuroraUrl
  if (!layerQueryUrl) {
    throw createError({ statusCode: 500, statusMessage: `Missing runtimeConfig URL for source ${source}` })
  }
  const updateUrl = layerQueryUrl.replace(/\/query\/?$/, '/updateFeatures')

  try {
    const token = await getArcGISToken(config)

    // ArcGIS expects x-www-form-urlencoded
    const updateParams = new URLSearchParams({
      f: 'json',
      token,
      features: JSON.stringify([
        {
          attributes: {
            OBJECTID,
            PROGRESS: progress,
          }
        }
      ])
    })

    const response = await $fetch(updateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: updateParams
    })

    // ArcGIS response shape: { updateResults: [ { success: boolean, error?: { code, description } } ] }
    const result = response?.updateResults?.[0]
    if (result?.success) {
      return {
        success: true,
        id: OBJECTID,
        source,
        progress,
        message: 'Job progress updated successfully'
      }
    }

    // If not success, surface ArcGIS error if present
    const arcErr = result?.error
    throw createError({
      statusCode: 502,
      statusMessage: arcErr?.description || 'ArcGIS updateFeatures failed'
    })
  } catch (err) {
    // Normalize thrown errors (Nuxt/Nitro style)
    const statusCode = err?.statusCode || 500
    const statusMessage =
      err?.statusMessage ||
      err?.message ||
      'Failed to update job progress'
    throw createError({ statusCode, statusMessage })
  }
})

/* ---------------- Token cache (in-file, small & safe) ---------------- */

let tokenCache = { token: null, expires: 0 }

async function getArcGISToken(config) {
  if (tokenCache.token && Date.now() < tokenCache.expires) {
    return tokenCache.token
  }

  const client_id = config.arcgisClientId
  const client_secret = config.arcgisClientSecret
  const tokenUrl = config.arcgisTokenUrl

  if (!client_id || !client_secret || !tokenUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'ArcGIS credentials misconfigured'
    })
  }

  try {
    const body = new URLSearchParams({
      client_id,
      client_secret,
      grant_type: 'client_credentials'
    })

    const res = await $fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })

    if (!res?.access_token || !res?.expires_in) {
      throw new Error('Invalid token response')
    }

    tokenCache.token = res.access_token
    tokenCache.expires = Date.now() + (Number(res.expires_in) * 1000) - 60_000 // renew 60s early
    return tokenCache.token
  } catch (e) {
    console.error('ArcGIS token error:', e)
    throw createError({ statusCode: 401, statusMessage: 'Failed to authenticate with ArcGIS' })
  }
}
