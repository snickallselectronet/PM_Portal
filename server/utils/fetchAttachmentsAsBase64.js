// server/utils/fetchAttachmentsAsBase64.js
// Gets a fresh ArcGIS token using client credentials, then fetches each
// attachment and encodes it as base64 for direct inclusion in the PA payload.

async function getArcGISToken(cfg) {
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

  if (!res.ok) throw new Error(`ArcGIS token request failed: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(`ArcGIS token error: ${data.error.message}`)
  return data.access_token
}

async function fetchAsBase64(url, token) {
  const res = await fetch(`${url}?token=${token}`)
  if (!res.ok) throw new Error(`Failed to fetch attachment: ${url} — ${res.status}`)
  const buffer = await res.arrayBuffer()
  return Buffer.from(buffer).toString('base64')
}

export async function fetchAttachmentsAsBase64(extracted, cfg, logger) {
  const { attachments, signatures } = extracted

  // No attachments — nothing to do
  if (!attachments.length && !signatures.length) {
    logger.log('No attachments to fetch.')
    return { attachments: [], signatures: [] }
  }

  // Get a fresh token
  logger.log('Fetching fresh ArcGIS token for attachment download...')
  let token
  try {
    token = await getArcGISToken(cfg)
    logger.log('ArcGIS token obtained.')
  } catch (e) {
    logger.log(`Failed to get ArcGIS token: ${e.message} — attachments will be skipped.`)
    return { attachments: [], signatures: [] }
  }

  // Fetch photos
  const encodedAttachments = []
  for (const a of attachments) {
    try {
      logger.log(`Fetching attachment: ${a.name}`)
      const content = await fetchAsBase64(a.url, token)
      encodedAttachments.push({
        name:        a.name,
        contentType: a.contentType,
        size:        a.size,
        type:        'Attachment',
        content,
      })
      logger.log(`Fetched: ${a.name}`)
    } catch (e) {
      logger.log(`Failed to fetch ${a.name}: ${e.message} — skipping.`)
    }
  }

  // Fetch signatures
  const encodedSignatures = []
  for (const s of signatures) {
    try {
      logger.log(`Fetching signature: ${s.name}`)
      const content = await fetchAsBase64(s.url, token)
      encodedSignatures.push({
        name:        s.name,
        contentType: s.contentType,
        size:        s.size,
        type:        'Signature',
        content,
      })
      logger.log(`Fetched: ${s.name}`)
    } catch (e) {
      logger.log(`Failed to fetch ${s.name}: ${e.message} — skipping.`)
    }
  }

  logger.log(`Attachments ready: ${encodedAttachments.length} photos, ${encodedSignatures.length} signatures.`)
  return { attachments: encodedAttachments, signatures: encodedSignatures }
}