// server/api/workorders/[wo_num]/arcgis-delete.post.js
// Deletes all ArcGIS records for a work order using arcgis_run data.
// Deletes child assets first, then main assets, then point layer.
// Resets work order status to QUEUED and clears arcgis_run/arcgis_object_id.

export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })
  const cfg   = useRuntimeConfig()
  const woNum = getRouterParam(event, 'wo_num')

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  }

  // ── Fetch arcgis_run ──────────────────────────────────────────────────────
  const woRes = await fetch(
    `${cfg.supabaseUrl}/rest/v1/work_orders?select=arcgis_run,arcgis_form&wo_num=eq.${encodeURIComponent(woNum)}&limit=1`,
    { headers }
  )
  const rows = await woRes.json()
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: `Work order ${woNum} not found` })

  const arcgisRun = rows[0].arcgis_run
  if (!arcgisRun) throw createError({ statusCode: 400, statusMessage: 'No arcgis_run data — nothing to delete' })

  const token   = await getArcGISToken(cfg)
  const runLogs = []
  const log     = (msg) => { runLogs.push(msg); console.log('[ArcGISDelete]', msg) }

  log(`Starting ArcGIS delete for WO ${woNum}...`)

  // ── Delete child assets first (usePointLayer=false) ───────────────────────
  const children = (arcgisRun.assets ?? []).filter(a => !a.usePointLayer)
  const parents  = (arcgisRun.assets ?? []).filter(a => a.usePointLayer)

  for (const asset of children) {
    await deleteFeatureByGuid(asset, token, log, cfg)
  }

  // ── Delete main assets ────────────────────────────────────────────────────
  for (const asset of parents) {
    await deleteFeatureByGuid(asset, token, log, cfg)
  }

  // ── Delete point layer ────────────────────────────────────────────────────
  if (arcgisRun.pointLayerGuid) {
    log(`Deleting point layer: ${arcgisRun.pointLayerGuid}`)
    const endpoint = `${cfg.arcgisBaseUrl}/${arcgisRun.formServiceLayer}/FeatureServer/0/deleteFeatures`
    const params   = new URLSearchParams({
      f:     'json',
      token,
      where: `globalId='${arcgisRun.pointLayerGuid}'`,
    })
    try {
      const res  = await fetch(`${endpoint}?${params}`, { method: 'POST' })
      const body = await res.json()
      if (body.deleteResults?.[0]?.success) {
        log('Point layer deleted.')
      } else {
        log(`Point layer delete may have failed: ${JSON.stringify(body.deleteResults?.[0]?.error ?? body)}`)
      }
    } catch (e) {
      log(`Point layer delete error: ${e.message}`)
    }
  }

  // ── Reset work order ──────────────────────────────────────────────────────
  log('Resetting work order status to QUEUED...')
  await fetch(
    `${cfg.supabaseUrl}/rest/v1/work_orders?wo_num=eq.${encodeURIComponent(woNum)}`,
    {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        status:           'QUEUED',
        arcgis_object_id: null,
        arcgis_run:       null,
        error_message:    null,
        updated_at:       new Date().toISOString(),
      })
    }
  )

  log(`Delete complete for WO ${woNum}.`)
  return { success: true, runLogs }
})

// ── Helper ────────────────────────────────────────────────────────────────────
async function deleteFeatureByGuid(asset, token, log, cfg) {
  log(`Deleting ${asset.name} (${asset.assetNum}) layer ${asset.layerNum} guid ${asset.guid}`)
  const endpoint = `${cfg.arcgisBaseUrl}/${asset.formServiceLayer}/FeatureServer/${asset.layerNum}/deleteFeatures`
  const params   = new URLSearchParams({
    f:     'json',
    token,
    where: `globalId='${asset.guid}'`,
  })
  try {
    const res  = await fetch(`${endpoint}?${params}`, { method: 'POST' })
    const body = await res.json()
    if (body.deleteResults?.[0]?.success) {
      log(`Deleted ${asset.name}: ${asset.guid}`)
    } else {
      log(`Delete may have failed for ${asset.name}: ${JSON.stringify(body.deleteResults?.[0]?.error ?? body)}`)
    }
  } catch (e) {
    log(`Delete error for ${asset.name}: ${e.message}`)
  }
}