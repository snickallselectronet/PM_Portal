// nuxt.config.ts
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  nitro: { preset: 'netlify' },
  runtimeConfig: {
    arcgisBaseUrl:      process.env.ARCGIS_BASE_URL,
    arcgisWoPoleUrl:    process.env.ARCGIS_WO_POLE_URL,
    arcgisAuroraUrl:    process.env.ARCGIS_AURORA_URL,
    arcgisClientId:     process.env.ARCGIS_CLIENT_ID,
    arcgisClientSecret: process.env.ARCGIS_CLIENT_SECRET,
    arcgisTokenUrl:     process.env.ARCGIS_TOKEN_URL,
    supabaseUrl:        process.env.SUPABASE_URL,
    supabaseSecretKey:  process.env.SUPABASE_SECRET_KEY,
    ingestSecret:       process.env.INGEST_SECRET,
    paWebhookUrl:       process.env.PA_WEBHOOK_URL,
    public: {
      apiBase:                '/api',
      supabaseUrl:            process.env.SUPABASE_URL,
      supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
      ingestSecret:           process.env.INGEST_SECRET,
    }
  }
})