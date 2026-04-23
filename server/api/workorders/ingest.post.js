// server/api/workorders/ingest.post.js
// Receives raw Aurora JSON, saves work order, builds arcgis_payload automatically.
// If WONum already exists, treats it as a re-issue: saves a revision with note
// "Re-issued by Aurora" and updates the work order with the new raw data.
import { sendToArcGIS } from '~/server/utils/sendToArcGIS'

export default defineEventHandler(async (event) => {
  const cfg    = useRuntimeConfig()
  const secret = getHeader(event, 'x-ingest-secret')

  if (!secret || secret !== cfg.ingestSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid ingest secret' })
  }

  const raw = await readBody(event)

  if (!raw?.WONum) {
    await logIngest(cfg, {
      woNum:   null,
      source:  getHeader(event, 'x-source') || 'unknown',
      status:  'error',
      message: 'Missing WONum in request body',
      detail:  { body_keys: Object.keys(raw ?? {}) }
    })
    throw createError({ statusCode: 400, statusMessage: 'WONum is required' })
  }

  const woNum       = String(raw.WONum)
  const parentWoNum = String(raw.ParentWONum ?? '')
  const source      = getHeader(event, 'x-source') || 'unknown'
  const now         = new Date().toISOString()
  const receivedAt  = getHeader(event, 'x-received-at') || now

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  }

  // ── Check if WO already exists ────────────────────────────────────────────
  const existsRes = await fetch(
    `${cfg.supabaseUrl}/rest/v1/work_orders?select=wo_num,raw_data&wo_num=eq.${encodeURIComponent(woNum)}&limit=1`,
    { headers }
  )
  const existsRows = await existsRes.json()
  const isReissue  = existsRows.length > 0

  // ── Step 1: Process raw data → processed_data ─────────────────────────────
  let processed
  try {
    processed = processWorkOrder(raw)
  } catch (e) {
    await logIngest(cfg, {
      woNum, source, status: 'error',
      message: `Processing failed: ${e.message}`,
      detail:  { error: e.message, raw }
    })
    throw createError({ statusCode: 500, statusMessage: `Processing failed: ${e.message}` })
  }

  // ── Step 2: Save or update work order ─────────────────────────────────────
  let revisionId = null
  if (isReissue) {
    // Save a revision recording the previous raw_data before overwriting
    const previousRaw = existsRows[0].raw_data

    // Create the ingest log entry first so we have its ID for the revision
    const logId = await logIngest(cfg, {
      woNum, source, status: 'success',
      message: `WO ${woNum} re-issued by Aurora — updating`,
      detail:  raw
    })

    // Save revision with ingest_log_id so it appears under this log entry
    const revRes = await fetch(`${cfg.supabaseUrl}/rest/v1/work_order_revisions`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({
        wo_num:         woNum,
        field:          'raw_data',
        previous_value: previousRaw,
        new_value:      raw,
        changed_by:     'aurora_ingest',
        changed_at:     now,
        note:           'Re-issued by Aurora',
        ingest_log_id:  logId ?? null,
      })
    })
    const revRows   = revRes.ok ? await revRes.json() : []
    revisionId       = revRows[0]?.id ?? null

    // Update the work order
    const updateRes = await fetch(
      `${cfg.supabaseUrl}/rest/v1/work_orders?wo_num=eq.${encodeURIComponent(woNum)}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          raw_data:       raw,
          processed_data: processed,
          parent_wo_num:  parentWoNum,
          is_edited:      false,
          status:         'RECEIVED',
          error_message:  null,
          arcgis_payload: null,
          updated_at:     now,
        })
      }
    )

    if (!updateRes.ok) {
      const err = await updateRes.text()
      throw createError({ statusCode: 502, statusMessage: `Failed to update work order: ${err}` })
    }

  } else {
    // New work order — insert fresh
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/work_orders`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        wo_num:         woNum,
        parent_wo_num:  parentWoNum,
        raw_data:       raw,
        processed_data: processed,
        status:         'RECEIVED',
        is_edited:      false,
        received_at:    receivedAt,
        updated_at:     now,
      })
    })

    if (!res.ok) {
      const err = await res.text()
      await logIngest(cfg, {
        woNum, source, status: 'error',
        message: `Supabase save failed: ${res.status}`,
        detail:  { supabase_response: err, raw }
      })
      throw createError({ statusCode: 502, statusMessage: `Failed to save work order: ${err}` })
    }
  }

  // ── Step 3: Build arcgis_payload ──────────────────────────────────────────
  let arcgisPayload = null
  let arcgisStatus  = 'RECEIVED'
  let arcgisError   = null

  try {
    const { payload, error, skipped } = await buildArcGISPayload(woNum, cfg)

    if (skipped) {
      arcgisStatus = 'SKIPPED'
    } else if (error) {
      arcgisStatus = 'ERROR'
      arcgisError  = error
    } else {
      arcgisPayload = payload
      arcgisStatus  = 'QUEUED'
    }
  } catch (e) {
    arcgisStatus = 'ERROR'
    arcgisError  = e.message
  }

  // ── Step 3b: If re-issue and payload errored, update revision note ──────────
  if (isReissue && arcgisStatus === 'ERROR' && revisionId) {
    await fetch(
      `${cfg.supabaseUrl}/rest/v1/work_order_revisions?id=eq.${encodeURIComponent(revisionId)}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ note: 'Re-issued by Aurora — Payload Error' })
      }
    )
  }

  // ── Step 4: Save payload to DB ────────────────────────────────────────────
  await fetch(
    `${cfg.supabaseUrl}/rest/v1/work_orders?wo_num=eq.${encodeURIComponent(woNum)}`,
    {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        arcgis_payload: arcgisPayload,
        status:         arcgisStatus,
        error_message:  arcgisError,
        updated_at:     now,
      })
    }
  )

  // ── Step 5: Auto-send to ArcGIS if payload built successfully ────────────
  let arcgisRun = null
  if (arcgisStatus === 'QUEUED' && arcgisPayload) {
    try {
      const sendResult = await sendToArcGIS(arcgisPayload, cfg)
      arcgisRun    = { ...sendResult.arcgisRun, runLogs: sendResult.runLogs }
      arcgisStatus = sendResult.success ? 'SENT' : 'ERROR'
      arcgisError  = sendResult.success ? null : sendResult.error

      await fetch(
        `${cfg.supabaseUrl}/rest/v1/work_orders?wo_num=eq.${encodeURIComponent(woNum)}`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            status:           arcgisStatus,
            error_message:    arcgisError,
            arcgis_object_id: sendResult.arcgisObjectId ?? null,
            arcgis_form:      arcgisPayload.FormServiceLayer,
            arcgis_run:       arcgisRun,
            updated_at:       now,
          })
        }
      )
    } catch (e) {
      arcgisStatus = 'ERROR'
      arcgisError  = `Auto-send failed: ${e.message}`
      await fetch(
        `${cfg.supabaseUrl}/rest/v1/work_orders?wo_num=eq.${encodeURIComponent(woNum)}`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ status: 'ERROR', error_message: arcgisError, updated_at: now })
        }
      )
    }
  }

  // ── Step 6: Log success for new ingests (re-issues logged above) ──────────
  if (!isReissue) {
    await logIngest(cfg, {
      woNum, source, status: 'success',
      message: `WO ${woNum} ingested — ArcGIS: ${arcgisStatus}`,
      detail:  raw
    })
  }

  return {
    success:      true,
    wo_num:       woNum,
    received_at:  receivedAt,
    arcgis_status: arcgisStatus,
    reissue:      isReissue,
  }
})