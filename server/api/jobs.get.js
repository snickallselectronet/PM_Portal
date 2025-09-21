// server/api/jobs.get.js
// GET /api/jobs?search=<term>
// Flatter structure, no shared utils. Token cache lives in this module only.

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const searchTerm = (query.search || '').toString()

  try {
    const token = await getArcGISToken(config)

    const params = new URLSearchParams({
      where: buildWhereClause(searchTerm),
      outFields: '*',
      f: 'json',
      returnGeometry: 'false',
      token
    })

    const [woPoleResponse, auroraResponse] = await Promise.all([
      $fetch(`${config.arcgisWoPoleUrl}?${params}`),
      $fetch(`${config.arcgisAuroraUrl}?${params}`)
    ])

    const woPoleJobs = (woPoleResponse?.features || []).map((f) => ({
      ...f.attributes,
      source: 'WO_POLE'
    }))

    const auroraJobs = (auroraResponse?.features || []).map((f) => ({
      ...f.attributes,
      source: 'AURORA'
    }))

    const jobs = [...woPoleJobs, ...auroraJobs]

    return {
      success: true,
      total: jobs.length,
      jobs
    }
  } catch (error) {
    console.error('GET /api/jobs error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch jobs' })
  }
})

/* --------------------- helpers (kept in-file) --------------------- */

// very small in-file cache to avoid reauthing every request
let tokenCache = { token: null, expires: 0 }

/** Get an ArcGIS token using client_credentials flow */
async function getArcGISToken(config) {
  // If valid cached token, use it
  if (tokenCache.token && Date.now() < tokenCache.expires) {
    return tokenCache.token
  }

  try {
    const body = new URLSearchParams({
      client_id: config.arcgisClientId,
      client_secret: config.arcgisClientSecret,
      grant_type: 'client_credentials'
    })

    const res = await $fetch(config.arcgisTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })

    // Cache: subtract 60s to be safe
    tokenCache.token = res.access_token
    tokenCache.expires = Date.now() + res.expires_in * 1000 - 60_000
    return tokenCache.token
  } catch (e) {
    console.error('ArcGIS token error:', e)
    throw createError({ statusCode: 401, statusMessage: 'Failed to authenticate with ArcGIS' })
  }
}

/** Build ArcGIS WHERE clause safely */
function buildWhereClause(term = '') {
  const t = String(term || '').trim()
  if (!t) return '1=1'
  const escaped = t.replace(/'/g, "''")
  return [
    `UPPER(PARENTWONUM) LIKE UPPER('%${escaped}%')`,
    `UPPER(WONUM) LIKE UPPER('%${escaped}%')`,
    `UPPER(JOB_DESCRIPTION) LIKE UPPER('%${escaped}%')`,
    `UPPER(LONG_DESCRIPTION) LIKE UPPER('%${escaped}%')`
  ].join(' OR ')
}
