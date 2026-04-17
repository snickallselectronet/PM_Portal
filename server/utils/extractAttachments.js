// server/utils/extractAttachments.js
// Extracts attachment URLs, signature URLs and the ArcGIS token from a
// Survey123 webhook payload. Returns a clean object for storage and PA sending.

export function extractAttachments(raw) {
  const featureAttachments = raw?.feature?.attachments ?? {}
  const token              = raw?.portalInfo?.token ?? null

  // Extract photos
  const attachments = (featureAttachments.Attachment ?? []).map(a => ({
    globalId:    a.globalId,
    name:        a.name,
    url:         a.url,
    contentType: a.contentType,
    size:        a.size,
    type:        'Attachment',
  }))

  // Extract signatures
  const signatures = (featureAttachments.Signature ?? []).map(s => ({
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
    arcgisToken: token,
    hasAttachments: attachments.length > 0 || signatures.length > 0,
  }
}