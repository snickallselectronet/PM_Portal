// server/api/field-processing/runs/[id].patch.js
// Save an edited processed_output, storing previous version in revisions.

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, { role: 'ADMIN' })
  const cfg  = useRuntimeConfig()
  const id   = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!body?.processed_output) {
    throw createError({ statusCode: 400, statusMessage: 'processed_output is required' })
  }

  const newOutput = typeof body.processed_output === 'string'
    ? JSON.parse(body.processed_output)
    : body.processed_output

  const headers = {
    'apikey':        cfg.supabaseSecretKey,
    'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  }

  // Fetch current output to store as previous
  const currentRes = await fetch(
    `${cfg.supabaseUrl}/rest/v1/field_processing_runs?select=processed_output&id=eq.${id}&limit=1`,
    { headers }
  )
  const currentRows = await currentRes.json()
  if (!currentRows.length) throw createError({ statusCode: 404, statusMessage: 'Run not found' })

  const previousOutput = currentRows[0].processed_output
  const now = new Date().toISOString()

  // Save revision + update run in parallel
  const [, updateRes] = await Promise.all([
    fetch(`${cfg.supabaseUrl}/rest/v1/field_processing_revisions`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        run_id:          id,
        previous_output: previousOutput,
        new_output:      newOutput,
        changed_by:      user.email,
        changed_at:      now,
        note:            body.note || null,
      })
    }),
    fetch(`${cfg.supabaseUrl}/rest/v1/field_processing_runs?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        processed_output: newOutput,
        updated_at:       now,
      })
    })
  ])

  if (!updateRes.ok) {
    const err = await updateRes.text()
    throw createError({ statusCode: 502, statusMessage: `Failed to update run: ${err}` })
  }

  return { success: true, updated_at: now }
})