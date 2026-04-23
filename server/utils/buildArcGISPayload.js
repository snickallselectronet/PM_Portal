// server/utils/buildArcGISPayload.js
// Ports ProcessWorkOrder.cs + AssetMapping.cs to JS.
// Reads processed_data from the work_orders table, looks up asset_mapping in Supabase,
// builds the arcgis_payload object ready for the 3-pass ArcGIS creation pipeline.
// Returns { payload, runLogs, error }

function makeLogger() {
  const lines = []
  return {
    log: (msg) => { lines.push(msg); console.log('[BuildPayload]', msg) },
    lines,
  }
}

// ─── Asset matching — ports AssetMapping.GetAssetsByClass ─────────────────────
function getAssetsByClass(mappings, assetClass, description) {
  const norm = (description ?? '').toUpperCase()
  return mappings.filter(m =>
    m.asset_class === assetClass &&
    m.is_active &&
    (
      (m.asset_name && norm.includes(m.asset_name.toUpperCase())) ||
      (Array.isArray(m.match_terms) && m.match_terms.some(t => norm.includes(t.toUpperCase())))
    )
  )
}

// ─── Asset matching — ports AssetMapping.GetAssetsByAssetName ─────────────────
function getAssetsByAssetName(mappings, assetName) {
  return mappings.filter(m =>
    m.is_active &&
    m.asset_name?.toLowerCase() === assetName?.toLowerCase()
  )
}

// ─── Clone a mapping row into a working asset object ─────────────────────────
function cloneAsset(mapping, assetNum) {
  return {
    AssetClass:            mapping.asset_class,
    AssetName:             mapping.asset_name,
    AssetNum:              assetNum,
    FormServiceLayer:      mapping.form_service_layer,
    FormServiceLayerNum:   mapping.form_service_layer_num,
    RelateGUIDKeyName:     mapping.relate_guid_key_name,
    UsePointLayerGUID:     mapping.use_point_layer_guid,
    SaveGUIDToChild:       mapping.save_guid_to_child,
    ChildKeys:             mapping.child_keys ?? [],
    PointLayerGUID:        null,
    ThisAssetsArcGISGUID:  null,
    ParentAssetsArcGISGUID: null,
  }
}

// ─── Recursively add child assets — ports AddDependentAssets ─────────────────
function addDependentAssets(parentAsset, assets, mappings, logger) {
  if (!parentAsset.ChildKeys?.length) return

  logger.log(`Processing dependent assets for parent '${parentAsset.AssetName}' (layer: ${parentAsset.FormServiceLayer})`)

  for (const childName of parentAsset.ChildKeys.filter(Boolean)) {
    logger.log(`Looking for child asset mappings for '${childName}'`)

    const childList = getAssetsByAssetName(mappings, childName)

    if (!childList.length) {
      logger.log(`No asset mapping found for child '${childName}'. Skipping.`)
      continue
    }

    let selectedChild
    if (childList.length > 1) {
      logger.log(`Multiple mappings for '${childName}'. Trying to match parent service layer '${parentAsset.FormServiceLayer}'.`)
      selectedChild = childList.find(c => c.form_service_layer === parentAsset.FormServiceLayer)
      if (!selectedChild) {
        throw new Error(`Multiple mappings for child '${childName}' but none match parent service layer '${parentAsset.FormServiceLayer}'.`)
      }
    } else {
      selectedChild = childList[0]
    }

    const cloned = cloneAsset(selectedChild, parentAsset.AssetNum)
    cloned.UsePointLayerGUID = selectedChild.use_point_layer_guid
    cloned.SaveGUIDToChild   = parentAsset.SaveGUIDToChild && selectedChild.save_guid_to_child

    logger.log(`Added dependent asset: ${cloned.AssetName} (AssetNum: ${cloned.AssetNum}, Layer: ${cloned.FormServiceLayer}/${cloned.FormServiceLayerNum}, UsePointLayerGUID: ${cloned.UsePointLayerGUID}, SaveGUIDToChild: ${cloned.SaveGUIDToChild})`)

    assets.push(cloned)
    addDependentAssets(cloned, assets, mappings, logger)
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────
// rawDataOverride — optional raw Aurora JSON to process instead of fetching from DB.
// Used when reprocessing a specific revision from the logs modal.
export async function buildArcGISPayload(woNum, config, rawDataOverride = null) {
  const logger = makeLogger()
  logger.log(`Starting buildArcGISPayload for WO ${woNum}...`)

  try {
    const headers = {
      'apikey':        config.supabaseSecretKey,
      'Authorization': `Bearer ${config.supabaseSecretKey}`,
      'Accept':        'application/json',
    }

    // ── Fetch work order (skip if raw data provided directly) ────────────────
    let raw, wo
    if (rawDataOverride) {
      logger.log('Using provided raw_data override.')
      raw = rawDataOverride
      wo  = { parent_wo_num: raw.ParentWONum ?? '' }
    } else {
      logger.log('Fetching work order from DB...')
      const woRes = await fetch(
        `${config.supabaseUrl}/rest/v1/work_orders?select=wo_num,parent_wo_num,raw_data&wo_num=eq.${encodeURIComponent(woNum)}&limit=1`,
        { headers }
      )
      if (!woRes.ok) throw new Error(`Failed to fetch work order: ${woRes.status}`)
      const woRows = await woRes.json()
      if (!woRows.length) throw new Error(`Work order ${woNum} not found`)
      wo  = woRows[0]
      raw = wo.raw_data
    }

    logger.log(`WorkType: ${raw.WorkType}`)

    // ── Skip non-processable work types ──────────────────────────────────────
    if (raw.WorkType === 'ADMIN') {
      logger.log('ADMIN work type — skipping ArcGIS processing.')
      return { payload: null, runLogs: logger.lines, skipped: true }
    }
    if (!['ARR', 'CD'].includes(raw.WorkType)) {
      throw new Error(`Unsupported WorkType: ${raw.WorkType}`)
    }

    // ── Fetch asset mappings ──────────────────────────────────────────────────
    logger.log('Fetching asset mappings from DB...')
    const mappingRes = await fetch(
      `${config.supabaseUrl}/rest/v1/asset_mapping?select=*&is_active=eq.true&limit=200`,
      { headers }
    )
    if (!mappingRes.ok) throw new Error(`Failed to fetch asset mappings: ${mappingRes.status}`)
    const mappings = await mappingRes.json()
    logger.log(`Loaded ${mappings.length} active asset mappings.`)

    // ── Check for forced decommissioning ─────────────────────────────────────
    let forceDecommissioning = false
    if (Array.isArray(raw.WPService)) {
      forceDecommissioning = raw.WPService.some(s => s?.ItemNum === 'REMOVE_ASSET_ADM')
      if (forceDecommissioning) logger.log('REMOVE_ASSET_ADM detected — forcing DECOMMISSIONING activity.')
    }

    // ── Determine main asset class, description, number ──────────────────────
    // Prefer ReplacementAssetNum, fall back to AssetNum (same logic as C#)
    const targetAssetNum = raw.ReplacementAssetNum ?? raw.AssetNum
    if (!targetAssetNum) throw new Error('No ReplacementAssetNum or AssetNum found at root level.')
    logger.log(`Target asset num: ${targetAssetNum}`)

    let mainAssetClass = ''
    let mainAssetDescription = ''
    let mainAssetNumber = ''
    let assetTag = ''

    if (Array.isArray(raw.Asset)) {
      const targetAsset = raw.Asset.find(a => a.AssetNum === targetAssetNum)
      const oldAsset    = raw.Asset.find(a => a.AssetNum !== targetAssetNum)

      if (targetAsset) {
        mainAssetClass       = targetAsset.AssetClass ?? ''
        mainAssetDescription = targetAsset.Description ?? ''
        mainAssetNumber      = targetAsset.AssetNum ?? ''
      }
      assetTag = (oldAsset?.AssetTag ?? targetAsset?.AssetTag) ?? ''
    }

    // ── Extract remaining fields ──────────────────────────────────────────────
    const parentWONum     = raw.ParentWONum ?? wo.parent_wo_num ?? ''
    const workOrderNum    = raw.WONum ?? woNum
    const jobDescription  = raw.Description ?? ''
    const longDescription = raw.LongDescription ?? ''
    const latitude        = raw.Locations?.[0]?.Latitude ?? 0
    const longitude       = raw.Locations?.[0]?.Longitude ?? 0

    logger.log(`ParentWONum: ${parentWONum}, Lat: ${latitude}, Lng: ${longitude}`)

    // ── Match main asset ──────────────────────────────────────────────────────
    logger.log(`Matching main asset: class=${mainAssetClass}, desc=${mainAssetDescription}`)
    const mainAssetMatches = getAssetsByClass(mappings, mainAssetClass, mainAssetDescription)

    if (!mainAssetMatches.length) {
      throw new Error(`No asset mapping found for class '${mainAssetClass}' with description '${mainAssetDescription}'.`)
    }

    const mainAssetMapping = mainAssetMatches[0]
    logger.log(`Main asset matched: ${mainAssetMapping.asset_name} (layer: ${mainAssetMapping.form_service_layer}/${mainAssetMapping.form_service_layer_num})`)

    // ── Build combined description (truncated to 950 chars) ──────────────────
    let combinedDescription = `${jobDescription}-${longDescription}`
    if (combinedDescription.length > 950) {
      combinedDescription = combinedDescription.substring(0, 950) + '... Description was truncated.'
    }

    // ── Build assets list ─────────────────────────────────────────────────────
    const clonedMain = cloneAsset(mainAssetMapping, mainAssetNumber)
    const assets = [clonedMain]
    addDependentAssets(clonedMain, assets, mappings, logger)

    // ── Process MultiAssetLocci ───────────────────────────────────────────────
    if (Array.isArray(raw.MultiAssetLocci)) {
      logger.log(`Processing ${raw.MultiAssetLocci.length} MultiAssetLocci entries...`)

      for (const multi of raw.MultiAssetLocci) {
        const multiAssetNum = multi.ReplacementAssetNum ?? multi.AssetNum
        if (!multiAssetNum) throw new Error(`No ReplacementAssetNum or AssetNum for multi-asset entry: ${JSON.stringify(multi)}`)

        const multiAssetClass       = multi.Asset?.[0]?.AssetClass ?? ''
        const multiAssetDescription = multi.Asset?.[0]?.Description ?? ''

        logger.log(`Multi-asset: class=${multiAssetClass}, desc=${multiAssetDescription}, num=${multiAssetNum}`)

        const multiMatches = getAssetsByClass(mappings, multiAssetClass, multiAssetDescription)
        if (!multiMatches.length) {
          throw new Error(`No mapping for multi-asset class '${multiAssetClass}' desc '${multiAssetDescription}'.`)
        }

        let chosenMulti
        if (multiMatches.length > 1) {
          logger.log(`Multiple matches for multi-asset '${multiAssetClass}'. Matching to parent service layer '${clonedMain.FormServiceLayer}'.`)
          chosenMulti = multiMatches.find(m => m.form_service_layer === clonedMain.FormServiceLayer)
          if (!chosenMulti) throw new Error(`No multi-asset match for parent service layer '${clonedMain.FormServiceLayer}'.`)
        } else {
          chosenMulti = multiMatches[0]
        }

        const clonedMulti = cloneAsset(chosenMulti, multiAssetNum)
        logger.log(`Multi-asset selected: ${clonedMulti.AssetName} (AssetNum: ${clonedMulti.AssetNum})`)

        assets.push(clonedMulti)
        addDependentAssets(clonedMulti, assets, mappings, logger)
      }
    }

    // ── Build output payload ──────────────────────────────────────────────────
    const payload = {
      FormServiceLayer:    mainAssetMapping.form_service_layer,
      FormServiceLayerNum: mainAssetMapping.form_service_layer_num,
      WONum:               workOrderNum,
      ParentWONum:         parentWONum,
      JobDescription:      combinedDescription,
      LongDescription:     longDescription,
      AssetTag:            assetTag,
      Latitude:            latitude,
      Longitude:           longitude,
      Activity:            forceDecommissioning ? 'DECOMMISSIONING' : null,
      AssetClassHashSet:   [...new Set(assets.map(a => a.AssetName))],
      Assets:              assets,
    }

    logger.log(`Payload built. ${assets.length} assets, ${payload.AssetClassHashSet.length} unique asset types.`)
    logger.log(`AssetClassHashSet: ${payload.AssetClassHashSet.join(', ')}`)

    return { payload, runLogs: logger.lines, error: null }

  } catch (err) {
    logger.log(`Error in buildArcGISPayload: ${err.message}`)
    return { payload: null, runLogs: logger.lines, error: err.message }
  }
}