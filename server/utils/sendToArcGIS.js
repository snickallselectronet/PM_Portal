// server/utils/sendToArcGIS.js
// Ports ArcGISService.cs 3-pass creation pipeline to JS.
// Pass 1: Point layer (FeatureServer/0)
// Pass 2: Main assets (UsePointLayerGUID=true)
// Pass 3: Child assets (UsePointLayerGUID=false)
// Rollback on any failure: delete child assets → delete point layer.
// Returns { success, runLogs, arcgisObjectId, arcgisRun, error }

function makeLogger() {
  const lines = []
  return {
    log: (msg) => { lines.push(msg); console.log('[SendArcGIS]', msg) },
    lines,
  }
}

// ─── Send a single addFeatures request ───────────────────────────────────────
async function addFeatures(formServiceLayer, layerNum, token, features, logger, cfg) {
  const endpoint = `${cfg.arcgisBaseUrl}/${formServiceLayer}/FeatureServer/${layerNum}/addFeatures`
  const params   = new URLSearchParams({
    f:        'json',
    token,
    features: JSON.stringify(features),
  })

  logger.log(`POST ${endpoint}`)
  const res = await fetch(`${endpoint}?${params}`, { method: 'POST' })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`ArcGIS HTTP error ${res.status}: ${body}`)
  }

  const data = await res.json()

  if (data.error) {
    throw new Error(`ArcGIS API error: code=${data.error.code} message=${data.error.message}`)
  }

  const addResults = data.addResults
  if (!addResults?.length) throw new Error('No addResults in ArcGIS response.')

  const first = addResults[0]
  if (first.success === false) {
    const desc = first.error?.description ?? 'Unknown error'
    throw new Error(`ArcGIS addFeature failed: ${desc}`)
  }

  const globalId = first.globalId
  if (!globalId) throw new Error('GlobalId missing in ArcGIS addResults response.')

  logger.log(`addFeatures succeeded. globalId: ${globalId}`)
  return globalId
}

// ─── Delete a feature by globalId ────────────────────────────────────────────
async function deleteFeature(formServiceLayer, layerNum, globalId, token, logger, cfg) {
  const endpoint = `${cfg.arcgisBaseUrl}/${formServiceLayer}/FeatureServer/${layerNum}/deleteFeatures`
  const params   = new URLSearchParams({
    f:     'json',
    token,
    where: `globalId='${globalId}'`,
  })

  logger.log(`DELETE ${endpoint} globalId=${globalId}`)
  try {
    const res = await fetch(`${endpoint}?${params}`, { method: 'POST' })
    const body = await res.text()
    logger.log(`Delete response: ${body}`)
  } catch (e) {
    logger.log(`Delete failed for ${globalId}: ${e.message}`)
  }
}

// ─── Rollback: delete all created assets then point layer ─────────────────────
async function rollback(payload, token, logger, cfg) {
  logger.log('Starting rollback...')

  for (const asset of payload.Assets) {
    if (asset.ThisAssetsArcGISGUID) {
      await deleteFeature(asset.FormServiceLayer, asset.FormServiceLayerNum, asset.ThisAssetsArcGISGUID, token, logger, cfg)
    }
  }

  const pointLayerGuid = payload.Assets[0]?.PointLayerGUID
  if (pointLayerGuid) {
    await deleteFeature(payload.FormServiceLayer, '0', pointLayerGuid, token, logger, cfg)
  }

  logger.log('Rollback completed.')
}

// ─── Update child assets with parent GUID (SaveGUIDToChild) ──────────────────
function updateChildAssets(parentAsset, parentGuid, assets, logger) {
  logger.log(`Updating children for parent '${parentAsset.AssetName}'`)
  for (const childKey of (parentAsset.ChildKeys ?? [])) {
    for (const child of assets) {
      if (child.AssetName === childKey && child.AssetNum === parentAsset.AssetNum) {
        child.ParentAssetsArcGISGUID = parentGuid
        logger.log(`Set ParentAssetsArcGISGUID on child '${child.AssetName}': ${parentGuid}`)
      }
    }
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function sendToArcGIS(payload, cfg) {
  const logger = makeLogger()
  logger.log(`Starting 3-pass ArcGIS send for WO ${payload.WONum}...`)

  // Deep clone payload so we can mutate GUIDs without affecting the stored version
  const p = JSON.parse(JSON.stringify(payload))

  let token
  try {
    token = await getArcGISToken(cfg)
    logger.log('ArcGIS token obtained.')
  } catch (e) {
    return { success: false, runLogs: logger.lines, error: `Token error: ${e.message}` }
  }

  // ── Pass 1: Point Layer ───────────────────────────────────────────────────
  logger.log('Pass 1: Creating point layer...')
  try {
    const assetClassList = (p.AssetClassHashSet ?? []).join(', ')
    let jobDesc = p.AssetTag ? `AssetTag=${p.AssetTag} - ${p.JobDescription}` : p.JobDescription
    jobDesc = `${jobDesc} - ${p.LongDescription}`

    const pointFeature = [{
      geometry: {
        x: p.Longitude,
        y: p.Latitude,
        spatialReference: { wkid: 4326 },
      },
      attributes: {
        PARENTWONUM:      p.ParentWONum,
        WONUM:            p.WONum,
        LONG_DESCRIPTION: jobDesc,
        PROGRESS:         'INPRG',
        ASSET_CLASS_LIST: assetClassList,
      }
    }]

    const pointLayerGuid = await addFeatures(p.FormServiceLayer, '0', token, pointFeature, logger, cfg)
    p.PointLayerGUID = pointLayerGuid

    // Assign PointLayerGUID to all main assets (UsePointLayerGUID=true)
    for (const asset of p.Assets) {
      if (asset.UsePointLayerGUID) {
        asset.PointLayerGUID = pointLayerGuid
        logger.log(`Assigned PointLayerGUID to '${asset.AssetName}': ${pointLayerGuid}`)
      }
    }

    // If decommissioning — create DECOM record
    if (p.Activity === 'DECOMMISSIONING') {
      logger.log('Decommissioning job — creating DECOM record...')
      try {
        // Find DECOM asset mapping from the assets array
        const decomAsset = p.Assets.find(a => a.AssetName === 'DECOM')
        if (decomAsset) {
          const decomFeature = [{
            attributes: {
              WONUM_GUID:             pointLayerGuid,
              DECOM_ASSET_CLASS_LIST: assetClassList,
            }
          }]
          await addFeatures(decomAsset.FormServiceLayer, decomAsset.FormServiceLayerNum, token, decomFeature, logger, cfg)
          logger.log('DECOM record created.')
        } else {
          logger.log('No DECOM asset mapping found — skipping DECOM record.')
        }
      } catch (e) {
        logger.log(`DECOM record creation failed: ${e.message} — continuing.`)
      }
    }

  } catch (e) {
    logger.log(`Pass 1 failed: ${e.message}`)
    return { success: false, runLogs: logger.lines, error: `Pass 1 failed: ${e.message}` }
  }

  // ── Pass 2: Main Assets (UsePointLayerGUID=true) ──────────────────────────
  logger.log('Pass 2: Creating main assets...')
  try {
    for (const asset of p.Assets) {
      if (!asset.UsePointLayerGUID) {
        logger.log(`Skipping '${asset.AssetName}' (UsePointLayerGUID=false) in Pass 2.`)
        continue
      }
      if (!asset.PointLayerGUID) {
        logger.log(`Skipping '${asset.AssetName}' — no PointLayerGUID.`)
        continue
      }

      logger.log(`Creating main asset '${asset.AssetName}' (${asset.AssetNum}) → layer ${asset.FormServiceLayerNum}`)

      const feature = [{
        geometry: {
          x: p.Longitude,
          y: p.Latitude,
          spatialReference: { wkid: 4326 },
        },
        attributes: {
          ASSETNUM:               asset.AssetNum,
          [asset.RelateGUIDKeyName]: asset.PointLayerGUID,
        }
      }]

      try {
        const globalId = await addFeatures(asset.FormServiceLayer, asset.FormServiceLayerNum, token, feature, logger, cfg)
        asset.ThisAssetsArcGISGUID = globalId
        logger.log(`Main asset '${asset.AssetName}' created: ${globalId}`)

        if (asset.SaveGUIDToChild) {
          updateChildAssets(asset, globalId, p.Assets, logger)
        }
      } catch (assetErr) {
        logger.log(`Error on main asset '${asset.AssetName}': ${assetErr.message}`)
        await rollback(p, token, logger, cfg)
        return { success: false, runLogs: logger.lines, error: `Pass 2 failed on '${asset.AssetName}': ${assetErr.message}` }
      }
    }
  } catch (e) {
    logger.log(`Pass 2 failed: ${e.message}`)
    await rollback(p, token, logger, cfg)
    return { success: false, runLogs: logger.lines, error: `Pass 2 failed: ${e.message}` }
  }

  // ── Pass 3: Child Assets (UsePointLayerGUID=false) ────────────────────────
  logger.log('Pass 3: Creating child assets...')
  try {
    for (const asset of p.Assets) {
      if (asset.UsePointLayerGUID) {
        logger.log(`Skipping '${asset.AssetName}' (UsePointLayerGUID=true) in Pass 3.`)
        continue
      }
      if (!asset.ParentAssetsArcGISGUID) {
        logger.log(`Skipping '${asset.AssetName}' — no ParentAssetsArcGISGUID.`)
        continue
      }
      if (!asset.AssetNum) {
        throw new Error(`AssetNum required for child asset '${asset.AssetName}'.`)
      }

      logger.log(`Creating child asset '${asset.AssetName}' (${asset.AssetNum}) → layer ${asset.FormServiceLayerNum}`)

      const feature = [{
        geometry: {
          x: p.Longitude,
          y: p.Latitude,
          spatialReference: { wkid: 4326 },
        },
        attributes: {
          ASSETNUM:                  asset.AssetNum,
          [asset.RelateGUIDKeyName]: asset.ParentAssetsArcGISGUID,
        }
      }]

      try {
        const globalId = await addFeatures(asset.FormServiceLayer, asset.FormServiceLayerNum, token, feature, logger, cfg)
        asset.ThisAssetsArcGISGUID = globalId
        logger.log(`Child asset '${asset.AssetName}' created: ${globalId}`)
      } catch (assetErr) {
        logger.log(`Error on child asset '${asset.AssetName}': ${assetErr.message}`)
        await rollback(p, token, logger, cfg)
        return { success: false, runLogs: logger.lines, error: `Pass 3 failed on '${asset.AssetName}': ${assetErr.message}` }
      }
    }
  } catch (e) {
    logger.log(`Pass 3 failed: ${e.message}`)
    await rollback(p, token, logger, cfg)
    return { success: false, runLogs: logger.lines, error: `Pass 3 failed: ${e.message}` }
  }

  logger.log(`All 3 passes completed successfully for WO ${p.WONum}.`)
  logger.log(`PointLayerGUID: ${p.PointLayerGUID}`)

  // Build structured record of every GUID created
  const arcgisRun = {
    sentAt:         new Date().toISOString(),
    pointLayerGuid: p.PointLayerGUID,
    formServiceLayer: p.FormServiceLayer,
    assets: p.Assets
      .filter(a => a.ThisAssetsArcGISGUID)
      .map(a => ({
        name:            a.AssetName,
        assetNum:        a.AssetNum,
        layerNum:        a.FormServiceLayerNum,
        formServiceLayer: a.FormServiceLayer,
        guid:            a.ThisAssetsArcGISGUID,
        relateGuidKey:   a.RelateGUIDKeyName,
        usePointLayer:   a.UsePointLayerGUID,
      }))
  }

  return {
    success:        true,
    runLogs:        logger.lines,
    arcgisObjectId: p.PointLayerGUID,
    arcgisRun,
    error:          null,
  }
}