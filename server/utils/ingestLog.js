// server/utils/ingestLog.js
// Nitro auto-imports this — call logIngest() from any server route.

export async function logIngest(cfg, { woNum, source, status, message, detail = null }) {
  try {
    await fetch(`${cfg.supabaseUrl}/rest/v1/ingest_log`, {
      method: 'POST',
      headers: {
        'apikey':        cfg.supabaseSecretKey,
        'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        wo_num:  woNum  ?? null,
        source:  source ?? 'unknown',
        status,
        message,
        detail:  detail ?? null,
      })
    })
  } catch (e) {
    // Never let logging crash the main request
    console.error('[ingestLog] Failed to write log:', e.message)
  }
}