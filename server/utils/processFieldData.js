// server/utils/processFieldData.js
// Port of ProcessFieldData.cs — matches C# logic exactly.
// Returns { result, runLogs } so callers can surface debug output.

function makeLogger() {
  const lines = []
  return {
    log: (msg) => { lines.push(msg); console.log('[FieldProcess]', msg) },
    lines,
  }
}

function extractFeatureSection(fieldData) {
  if (fieldData && fieldData.feature) return fieldData.feature
  return {}
}

function processXarms(workOrder) {
  const processed = JSON.parse(JSON.stringify(workOrder))
  const poleXarms = processed?.repeats?.POLE_XARM
  if (Array.isArray(poleXarms)) {
    for (const xarm of poleXarms) {
      const xarmAssetNum = xarm?.attributes?.ASSETNUM
      const insulators = xarm?.repeats?.POLE_INSULATOR
      if (Array.isArray(insulators) && xarmAssetNum) {
        xarm.repeats.POLE_INSULATOR = insulators.filter(
          ins => ins?.attributes?.ASSETNUM === xarmAssetNum
        )
      }
    }
  }
  return processed
}

function propagateFieldLabel(fieldData, logger) {
  logger.log('Propagating FIELD_LABEL...')
  let fieldLabel = ''
  const repeats = fieldData.repeats
  if (!repeats) return fieldData

  if (Array.isArray(repeats.POLE)) {
    for (const pole of repeats.POLE) {
      const lbl = pole?.attributes?.FIELD_LABEL
      if (lbl && lbl.trim()) {
        fieldLabel = lbl
        logger.log(`Found FIELD_LABEL: ${fieldLabel}`)
        break
      }
    }
  }

  if (fieldLabel) {
    for (const group of ['POLE_XARM']) {
      if (Array.isArray(repeats[group])) {
        for (const item of repeats[group]) {
          if (item.attributes) {
            item.attributes.FIELD_LABEL = fieldLabel
            logger.log(`Overwrote FIELD_LABEL in ${group} item.`)
          }
          if (group === 'POLE_XARM' && Array.isArray(item?.repeats?.POLE_INSULATOR)) {
            for (const ins of item.repeats.POLE_INSULATOR) {
              if (ins.attributes) {
                ins.attributes.FIELD_LABEL = fieldLabel
                logger.log('Overwrote FIELD_LABEL in POLE_INSULATOR.')
              }
            }
          }
        }
      }
    }
  } else {
    logger.log('No valid FIELD_LABEL found in POLE to propagate.')
  }

  return fieldData
}

const EDGE_CASE_EXCEPTIONS = new Set(['STAY_QTY', 'STAY_SIZE'])

function handleEdgeCases(attributeName) {
  for (const exc of EDGE_CASE_EXCEPTIONS) {
    if (attributeName.startsWith(exc + '_')) return exc
  }
  return attributeName
}

function processAttribute(assetAttributeID, value) {
  assetAttributeID = handleEdgeCases(assetAttributeID)
  const pattern = /^(?<AttributeName>.+?)(?<Suffix>_i|_[0-9]+i|_[0-9]+)$/
  const match = assetAttributeID.match(pattern)
  if (match) {
    const attributeName = match.groups.AttributeName
    const suffix = match.groups.Suffix
    if (suffix === '_i') {
      return { attributeName, value: parseInt(value, 10), maxCounter: 0 }
    }
    if (/_[0-9]+i$/.test(suffix)) {
      const n = parseInt(suffix.replace(/^_/, '').replace(/i$/, ''), 10)
      return { attributeName, value: parseInt(value, 10), maxCounter: n }
    }
    if (/_[0-9]+$/.test(suffix)) {
      const n = parseInt(suffix.replace(/^_/, ''), 10)
      return { attributeName, value, maxCounter: n }
    }
  }
  return { attributeName: assetAttributeID, value, maxCounter: 0 }
}

function addProcessedAsset(wospecArray, wonum, assetAttributeID, section, value) {
  if (!wonum || !assetAttributeID || !section) return
  const asset = { WONum: wonum, AssetAttributeID: assetAttributeID, Section: section }
  if (typeof value === 'number') {
    if (value !== 0) asset.NUMValue = value
  } else if (typeof value === 'string' && value.trim() !== '') {
    asset.ALNValue = value
  }
  if ('NUMValue' in asset || 'ALNValue' in asset) {
    wospecArray.push(asset)
  }
}

// _datesSections is a shared Set passed through all recursive calls so that
// COMM_DATE / INSTALL_DATE are written only once per unique section (ASSETNUM).
function processRepeats(repeats, wonum, _parentSection, wospecArray, excluded, formattedCommDate, formattedInstallDate, logger, _datesSections = new Set()) {
  const attributeCounters = {}

  for (const [repeatName, repeatItems] of Object.entries(repeats)) {
    if (!Array.isArray(repeatItems)) continue

    let lastValidAssetNum = ''

    // First pass — find last valid ASSETNUM
    for (const item of repeatItems) {
      const assetNum = item?.attributes?.ASSETNUM
      if (assetNum && assetNum.trim()) lastValidAssetNum = assetNum
    }

    // Second pass — process
    for (const item of repeatItems) {
      const attributes = item?.attributes
      if (!attributes) continue

      const section = attributes.ASSETNUM || lastValidAssetNum

      // Add COMM_DATE and INSTALL_DATE once per unique section
      if (section && !_datesSections.has(section)) {
        _datesSections.add(section)
        if (formattedCommDate) {
          wospecArray.push({ WONum: wonum, AssetAttributeID: 'COMM_DATE', Section: section, ALNValue: formattedCommDate })
        }
        if (formattedInstallDate) {
          wospecArray.push({ WONum: wonum, AssetAttributeID: 'INSTALL_DATE', Section: section, ALNValue: formattedInstallDate })
        }
      }

      for (const [attrKey, attrVal] of Object.entries(attributes)) {
        if (attrKey === 'COMM_DATE' || attrKey === 'INSTALL_DATE') continue
        if (attrVal === null || attrVal === undefined) continue
        if (typeof attrVal === 'string' && attrVal.trim() === '') continue

        const { attributeName, value, maxCounter } = processAttribute(attrKey, attrVal)

        if (excluded.some(ex => ex.toLowerCase() === attributeName.toLowerCase())) continue

        let finalName = attributeName
        if (maxCounter > 0) {
          if (!attributeCounters[attributeName]) attributeCounters[attributeName] = 0
          attributeCounters[attributeName]++
          if (attributeCounters[attributeName] > maxCounter) {
            logger.log(`Skipping ${attributeName} beyond max count ${maxCounter}`)
            continue
          }
          finalName = `${attributeName}_${attributeCounters[attributeName]}`
        }

        addProcessedAsset(wospecArray, wonum, finalName, section, value)
      }

      // Recurse — pass the shared _datesSections Set so it accumulates across all levels
      if (item.repeats && typeof item.repeats === 'object') {
        processRepeats(item.repeats, wonum, section, wospecArray, excluded, formattedCommDate, formattedInstallDate, logger, _datesSections)
      }
    }
  }
}

export async function processFieldData(jsonData, config) {
  const logger = makeLogger()
  logger.log('Starting ProcessFieldData...')

  try {
    logger.log('Loading exclusions from DB...')
    const excRes = await fetch(
      `${config.supabaseUrl}/rest/v1/field_processing_exclusions?select=attribute&is_active=eq.true`,
      {
        headers: {
          'apikey':        config.supabaseSecretKey,
          'Authorization': `Bearer ${config.supabaseSecretKey}`,
          'Accept':        'application/json'
        }
      }
    )
    if (!excRes.ok) throw new Error(`Failed to load exclusions: ${excRes.status}`)
    const excRows = await excRes.json()
    const excluded = excRows.map(r => r.attribute)
    logger.log(`Loaded ${excluded.length} exclusions: ${excluded.join(', ')}`)

    logger.log("Extracting 'feature' section...")
    let fieldData = extractFeatureSection(jsonData)

    logger.log('Processing Xarms...')
    fieldData = processXarms(fieldData)

    fieldData = propagateFieldLabel(fieldData, logger)

    logger.log("Wrapping processed data in 'feature'...")
    fieldData = { feature: fieldData }

    logger.log('Constructing response object...')
    const wonum = fieldData?.feature?.attributes?.WONUM ?? ''
    const response = {
      WONum:      wonum,
      Status:     'FSPCOMP',
      StatusDate: new Date().toISOString().slice(0, 19),
      Memo:       'Updating the replaced assets',
      FSPNote:    'As built data',
    }

    let formattedCommDate = ''
    let formattedInstallDate = ''
    try {
      logger.log('Extracting and formatting COMM_DATE and INSTALL_DATE...')
      const commDateMs = fieldData?.feature?.attributes?.COMM_DATE
      formattedCommDate = commDateMs
        ? new Date(Number(commDateMs)).toISOString().slice(0, 10)
        : ''
      const installDateMs = fieldData?.feature?.attributes?.INSTALL_DATE
      formattedInstallDate = installDateMs
        ? new Date(Number(installDateMs)).toISOString().slice(0, 10)
        : formattedCommDate
      logger.log(`Formatted COMM_DATE: ${formattedCommDate}, INSTALL_DATE: ${formattedInstallDate}`)
    } catch (e) {
      logger.log(`Error formatting dates: ${e.message} — defaulting to empty`)
      formattedCommDate = ''
      formattedInstallDate = ''
    }

    logger.log('Processing repeats...')
    const wospecArray = []
    const repeats = fieldData?.feature?.repeats
    if (repeats && typeof repeats === 'object') {
      processRepeats(repeats, wonum, '', wospecArray, excluded, formattedCommDate, formattedInstallDate, logger)
    }

    response.WOSpec = wospecArray
    logger.log(`ProcessFieldData completed. ${wospecArray.length} WOSpec entries produced.`)

    return { result: response, runLogs: logger.lines }
  } catch (err) {
    logger.log(`Error in ProcessFieldData: ${err.message}`)
    return { result: null, runLogs: logger.lines, error: err.message }
  }
}