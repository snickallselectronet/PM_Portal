export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const jobId = getRouterParam(event, 'id')
  const body = await readBody(event)
  
  if (!body.source || !body.progress) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: source and progress'
    })
  }

  if (!['INPRG', 'COMP'].includes(body.progress)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Progress must be either INPRG or COMP'
    })
  }

  try {
    // Get ArcGIS access token
    const token = await getArcGISToken(config)
    
    // Determine which endpoint to use based on source
    let updateUrl
    if (body.source === 'WO_POLE') {
      updateUrl = config.arcgisWoPoleUrl.replace('/query', '/updateFeatures')
    } else if (body.source === 'AURORA') {
      updateUrl = config.arcgisAuroraUrl.replace('/query', '/updateFeatures')
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: `Unknown source: ${body.source}`
      })
    }

    // Prepare the update data
    const updateParams = new URLSearchParams({
      f: 'json',
      token: token,
      features: JSON.stringify([{
        attributes: {
          OBJECTID: parseInt(jobId),
          PROGRESS: body.progress
        }
      }])
    })

    // Send update request to ArcGIS
    const response = await $fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: updateParams
    })

    // Check if update was successful
    if (response.updateResults && response.updateResults[0] && response.updateResults[0].success) {
      return {
        success: true,
        message: 'Job progress updated successfully'
      }
    } else {
      throw createError({
        statusCode: 500,
        statusMessage: response.updateResults?.[0]?.error?.description || 'Failed to update job progress'
      })
    }

  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update job progress'
    })
  }
})

// Token cache and function
let tokenCache = {
  token: null,
  expires: 0
}

async function getArcGISToken(config) {
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
    
    tokenCache.token = response.access_token
    tokenCache.expires = Date.now() + (response.expires_in * 1000) - 60000

    return response.access_token
  } catch (error) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Failed to authenticate with ArcGIS'
    })
  }
}