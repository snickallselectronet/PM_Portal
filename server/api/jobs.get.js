export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const searchTerm = query.search || ''
  
  try {
    // Get ArcGIS access token
    const token = await getArcGISToken(config)
    
    // Build ArcGIS query parameters
    const params = new URLSearchParams({
      where: buildWhereClause(searchTerm),
      outFields: '*',
      f: 'json',
      returnGeometry: 'false',
      token: token
    })

    // Fetch from both endpoints
    const [woPoleResponse, auroraResponse] = await Promise.all([
      $fetch(`${config.arcgisWoPoleUrl}?${params}`),
      $fetch(`${config.arcgisAuroraUrl}?${params}`)
    ])

    // Transform and combine data with safety checks
    const woPoleJobs = (woPoleResponse?.features || []).map(feature => ({
      ...feature.attributes,
      source: 'WO_POLE'
    }))

    const auroraJobs = (auroraResponse?.features || []).map(feature => ({
      ...feature.attributes,
      source: 'AURORA'
    }))

    const allJobs = [...woPoleJobs, ...auroraJobs]

    return {
      jobs: allJobs,
      total: allJobs.length
    }
  } catch (error) {
    console.error('Error fetching jobs:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch jobs'
    })
  }
})

// Cache for token to avoid repeated requests
let tokenCache = {
  token: null,
  expires: 0
}

async function getArcGISToken(config) {
  // Check if we have a valid cached token
  if (tokenCache.token && Date.now() < tokenCache.expires) {
    return tokenCache.token
  }

  try {
    const tokenParams = new URLSearchParams({
      client_id: config.arcgisClientId,
      client_secret: config.arcgisClientSecret,
      grant_type: 'client_credentials'
    })

    const response = await $fetch(config.arcgisTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams
    })

    // Cache the token (expires_in is in seconds, convert to milliseconds)
    tokenCache.token = response.access_token
    tokenCache.expires = Date.now() + (response.expires_in * 1000) - 60000 // Subtract 1 minute for safety

    return response.access_token
  } catch (error) {
    console.error('Error getting ArcGIS token:', error)
    throw createError({
      statusCode: 401,
      statusMessage: 'Failed to authenticate with ArcGIS'
    })
  }
}

function buildWhereClause(searchTerm) {
  if (!searchTerm.trim()) {
    return '1=1' // Return all records
  }

  const escapedTerm = searchTerm.replace(/'/g, "''")
  
  return `
    UPPER(PARENTWONUM) LIKE UPPER('%${escapedTerm}%') OR 
    UPPER(WONUM) LIKE UPPER('%${escapedTerm}%') OR 
    UPPER(JOB_DESCRIPTION) LIKE UPPER('%${escapedTerm}%') OR 
    UPPER(LONG_DESCRIPTION) LIKE UPPER('%${escapedTerm}%')
  `.replace(/\s+/g, ' ').trim()
}