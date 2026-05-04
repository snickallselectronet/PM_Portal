// server/utils/fetchAttachmentsFromService.js
// Fetches attachment METADATA (URLs, names, sizes) directly from the ArcGIS
// Feature Service using the feature's OBJECTID.
//
// TOKEN STRATEGY:
//   This function accepts a token parameter rather than sourcing it internally.
//   The caller decides which token to use:
//
//   - At INGEST time: pass the webhook token (raw.portalInfo.token) — it is
//     fresh and works for the metadata query. The webhook token is short-lived
//     so this only works reliably at ingest time.
//
//   - At REFRESH time (manual re-check via the UI): pass a fresh client
//     credentials token via getArcGISToken(cfg) — the webhook token will have
//     expired by then.
//
// Confirmed payload paths (from real submissions):
//   raw.feature.attributes.OBJECTID  — e.g. 638
//   raw.surveyInfo.serviceUrl        — e.g. https://services-ap1.arcgis.com/.../WO_POLE/FeatureServer

export async function fetchAttachmentsFromService(raw, token, logger) {
  const objectId   = raw?.feature?.attributes?.OBJECTID ?? raw?.feature?.attributes?.objectId ?? null
  const serviceUrl = raw?.surveyInfo?.serviceUrl?.replace(/\/$/, '') ?? null

  if (!objectId) {
    logger.log('fetchAttachmentsFromService: no OBJECTID in feature.attributes — cannot query service.')
    return emptyResult()
  }

  if (!serviceUrl) {
    logger.log('fetchAttachmentsFromService: no serviceUrl in surveyInfo — cannot query service.')
    return emptyResult()
  }

  if (!token) {
    logger.log('fetchAttachmentsFromService: no token provided — cannot query service.')
    return emptyResult()
  }

  // Layer 0 is always the main WORKORDER feature layer
  const queryUrl = `${serviceUrl}/0/queryAttachments`
  const params   = new URLSearchParams({
    f:         'json',
    token,
    objectIds: String(objectId),
    returnUrl: 'true',
  })

  logger.log(`Querying ArcGIS attachments: ${queryUrl}?objectIds=${objectId}`)

  let data
  try {
    const res = await fetch(`${queryUrl}?${params}`)
    if (!res.ok) {
      logger.log(`ArcGIS queryAttachments HTTP ${res.status} — falling back to empty.`)
      return emptyResult()
    }
    data = await res.json()
  } catch (e) {
    logger.log(`ArcGIS queryAttachments network error: ${e.message} — falling back to empty.`)
    return emptyResult()
  }

  if (data?.error) {
    logger.log(`ArcGIS queryAttachments error: ${data.error.message ?? JSON.stringify(data.error)}`)
    return emptyResult()
  }

  // Response shape: { attachmentGroups: [{ objectId, attachmentInfos: [...] }] }
  const groups = data?.attachmentGroups ?? []
  const infos  = groups.flatMap(g => g.attachmentInfos ?? [])

  logger.log(`queryAttachments returned ${infos.length} attachment(s) for objectId ${objectId}.`)

  if (!infos.length) {
    return emptyResult()
  }

  const attachments = []
  const signatures  = []

  for (const info of infos) {
    // returnUrl=true provides a full URL. Fallback constructs from the known
    // pattern seen in real payloads: {serviceUrl}/0/{objectId}/attachments/{id}
    const url = info.url ?? `${serviceUrl}/0/${objectId}/attachments/${info.id}`

    // Classify using keywords — Survey123 sets "Attachment" or "Signature"
    // (confirmed in real payloads). Handle both string and array forms.
    const kw          = Array.isArray(info.keywords) ? info.keywords : [info.keywords ?? '']
    const isSignature = kw.some(k => k?.toLowerCase() === 'signature') ||
                        (info.name ?? '').toLowerCase().includes('signature')

    const record = {
      globalId:    info.globalId ?? String(info.id),
      name:        info.name ?? `attachment_${info.id}`,
      url,
      contentType: info.contentType ?? 'application/octet-stream',
      size:        info.size ?? 0,
      type:        isSignature ? 'Signature' : 'Attachment',
    }

    if (isSignature) {
      signatures.push(record)
    } else {
      attachments.push(record)
    }
  }

  logger.log(`Service query classified: ${attachments.length} photo(s), ${signatures.length} signature(s).`)

  return {
    attachments,
    signatures,
    hasAttachments: attachments.length > 0 || signatures.length > 0,
    source:         'service_query',
  }
}

function emptyResult() {
  return {
    attachments:    [],
    signatures:     [],
    hasAttachments: false,
    source:         'service_query',
  }
}