export default defineEventHandler(async (event) => {
  deleteCookie(event, 'session', { path: '/' })
  return { ok: true }
})
