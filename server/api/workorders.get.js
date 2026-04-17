// server/api/workorders.get.js
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const cfg = useRuntimeConfig()

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Accept':        'application/json',
  }

  // Fetch work orders with embedded revision count via PostgREST resource embedding
  const url = `${cfg.supabaseUrl}/rest/v1/work_orders`
    + `?select=wo_num,parent_wo_num,status,is_edited,created_at,received_at,updated_at,processed_data,work_order_revisions(id)`
    + `&order=wo_num.asc`
    + `&limit=2000`

  const res = await fetch(url, { headers })

  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: 'Failed to fetch work orders from Supabase' })
  }

  const rows = await res.json()

  const data = rows
    .filter(row => row.processed_data)
    .map(row => ({
      ...(row.processed_data ?? {}),
      WONum:          row.wo_num,
      ParentWONum:    row.parent_wo_num,
      _status:        row.status,
      _isEdited:      row.is_edited,
      _hasRevisions:  (row.work_order_revisions?.length ?? 0) > 0,
      _createdAt:     row.created_at,
      _receivedAt:    row.received_at,
      _updatedAt:     row.updated_at,
    }))

  return {
    data,
    updatedAt: rows.length ? rows[rows.length - 1].updated_at : null,
  }
})