export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  ssr: false,
  nitro: {
    preset: 'netlify'
  },
  runtimeConfig: {
    // Server-side only (private)
    arcgisWoPoleUrl: process.env.ARCGIS_WO_POLE_URL,
    arcgisAuroraUrl: process.env.ARCGIS_AURORA_URL,
    arcgisClientId: process.env.ARCGIS_CLIENT_ID,
    arcgisClientSecret: process.env.ARCGIS_CLIENT_SECRET,
    arcgisTokenUrl: process.env.ARCGIS_TOKEN_URL,
    public: {
      // Client-side accessible
      loginUsername: process.env.LOGIN_USERNAME,
      loginPassword: process.env.LOGIN_PASSWORD,
      apiBase: '/api'
    }
  }
})