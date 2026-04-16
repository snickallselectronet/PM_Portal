// server/utils/processWorkOrder.js
// Converts raw Aurora JSON into the processed_data shape used by the card.
// Called by both the ingest endpoint and the save endpoint.

export function processWorkOrder(raw) {
  const assetNum   = raw.AssetNum ?? ''
  const replacement = raw.ReplacementAssetNum ?? null
  const assetArray  = raw.Asset ?? []

  // Target asset = replacement if present, else original
  const targetNum     = replacement || assetNum
  const targetAsset   = assetArray.find(a => a.AssetNum === targetNum) ?? assetArray[0] ?? {}
  const originalAsset = assetArray.find(a => a.AssetNum !== targetNum) ?? {}

  const mainAsset = {
    asset_num:   targetAsset.AssetNum   ?? assetNum,
    description: targetAsset.Description ?? '',
    asset_tag:   targetAsset.AssetTag    ?? '',
    field_label: targetAsset.FieldLabel  ?? '',
    asset_class: targetAsset.AssetClass  ?? '',
  }

  const isReplacement = !!replacement
  const replacementData = isReplacement ? {
    replacement_asset_num:   replacement,
    replacement_description: targetAsset.Description ?? '',
    new_material:            raw.NewMaterial ?? '',
    is_replacement:          true,
    original_asset_num:      assetNum,
    original_description:    originalAsset.Description ?? '',
  } : null

  // Multi-assets
  const multiRaw   = raw.MultiAssetLocci ?? []
  const multiAssets = multiRaw.map(m => {
    const mAssets   = m.Asset ?? []
    const mOrigNum  = m.AssetNum ?? ''
    const mRepNum   = m.ReplacementAssetNum ?? null
    const mTargetNum = mRepNum || mOrigNum
    const mTarget   = mAssets.find(a => a.AssetNum === mTargetNum) ?? mAssets[0] ?? {}
    return {
      original_asset_num:      mOrigNum,
      original_tag:            mTarget.AssetTag    ?? '',
      replacement_asset_num:   mRepNum,
      replacement_description: mTarget.Description ?? '',
      asset_class:             mTarget.AssetClass  ?? '',
    }
  })

  // Location
  const locations = raw.Locations ?? []
  const loc       = locations[0] ?? {}
  const location  = {
    gxp:       loc.GXP       ?? '',
    network:   loc.Network   ?? '',
    latitude:  loc.Latitude  ?? null,
    longitude: loc.Longitude ?? null,
  }

  // Doc links
  const docLinks = (raw.DocLinks ?? []).map(d => ({
    description: d.Description ?? '',
    url:         d.URLName     ?? '',
  }))

  // Cost
  const wpServices = raw.WPService ?? []
  const totalCost  = wpServices.reduce((sum, s) => sum + (parseFloat(s.LineCost) || 0), 0)
  const lineItems  = wpServices.map(s => ({
    item_num:  s.ItemNum  ?? '',
    line_cost: s.LineCost ?? null,
  }))
  const forceDecom = wpServices.some(s => s.ItemNum === 'REMOVE_ASSET_ADM')

  // Target finish date — date only
  const rawDate     = raw.TargetFinishDate ?? ''
  const targetFinish = rawDate ? rawDate.slice(0, 10) : ''

  return {
    WONum:               raw.WONum         ?? '',
    ParentWONum:         raw.ParentWONum   ?? '',
    WorkType:            raw.WorkType      ?? '',
    WorkDescription:     raw.Description   ?? '',
    LongDescription:     raw.LongDescription ?? '',
    FSPNote:             raw.FSPNote       ?? '',
    Status:              raw.Status        ?? '',
    TargetFinishDate:    targetFinish,
    ServiceAddress:      raw.ServiceAddress ?? '',
    LiveLineOrIsolated:  raw.LiveLineOrIsolated ?? '',
    ForceDecommissioning: forceDecom,
    MainAsset:           mainAsset,
    Replacement:         replacementData,
    IsReplacement:       isReplacement,
    IsMultiAsset:        multiAssets.length > 0,
    MultiAssets:         multiAssets,
    Location:            location,
    DocLinks:            docLinks,
    Cost: {
      total_cost: Math.round(totalCost * 100) / 100,
      line_items: lineItems,
      sap_po_num: raw.SAPPONum ?? '',
    },
  }
}