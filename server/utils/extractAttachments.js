// server/utils/extractAttachments.js
// Extracts attachment metadata from the Survey123 webhook payload body.
//
// This is the PRIMARY path — Survey123 includes full attachment objects
// (with URLs) in raw.feature.attachments when they are present.
//
// Confirmed payload structure (from real submission):
//   raw.feature.attachments.Attachment  — array of photo attachment objects
//   raw.feature.attachments.Signature   — array of signature attachment objects
//   raw.portalInfo.token                — bearer token for URL access
//
// Each attachment object contains: globalId, parentGlobalId, name,
// contentType, keywords, size, id, url
//
// This function returns an empty result (hasAttachments: false) when the
// attachments key is absent — which Survey123 does inconsistently. In that
// case, ingest.post.js will fall back to fetchAttachmentsFromService.js.

export function extractAttachments(raw) {
  const featureAttachments = raw?.feature?.attachments ?? null
  const token              = raw?.portalInfo?.token ?? null

  // If the key is entirely absent, signal that cleanly so the caller
  // knows to try the service query fallback
  if (!featureAttachments || typeof featureAttachments !== 'object') {
    return emptyResult(token, 'webhook_payload_absent')
  }

  const rawAttachments = featureAttachments.Attachment ?? []
  const rawSignatures  = featureAttachments.Signature  ?? []

  const attachments = rawAttachments.map(a => ({
    globalId:    a.globalId,
    name:        a.name,
    url:         a.url,
    contentType: a.contentType,
    size:        a.size,
    type:        'Attachment',
  }))

  const signatures = rawSignatures.map(s => ({
    globalId:    s.globalId,
    name:        s.name,
    url:         s.url,
    contentType: s.contentType,
    size:        s.size,
    type:        'Signature',
  }))

  return {
    attachments,
    signatures,
    arcgisToken:    token,
    hasAttachments: attachments.length > 0 || signatures.length > 0,
    source:         'webhook_payload',
  }
}

function emptyResult(token, source = 'webhook_payload') {
  return {
    attachments:    [],
    signatures:     [],
    arcgisToken:    token,
    hasAttachments: false,
    source,
  }
}