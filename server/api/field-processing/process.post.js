// server/api/field-processing/process.post.js
// Accepts raw Survey123 JSON, runs processFieldData, returns logs + result.
// No DB writes — debug/troubleshooting endpoint only.

export default defineEventHandler(async (event) => {
  await requireAuth(event, { role: 'ADMIN' })

  const body = await readBody(event)
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Body must be a JSON object' })
  }

  const config = useRuntimeConfig()
  const { result, runLogs, error } = await processFieldData(body, {
    supabaseUrl: config.supabaseUrl,
    supabaseSecretKey: config.supabaseSecretKey,
  })

  return {
    success: !error,
    error: error ?? null,
    runLogs,
    result,
  }
})