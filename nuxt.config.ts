// nuxt.config.ts
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  nitro: { preset: 'netlify' }, 
  runtimeConfig: {
    arcgisWoPoleUrl: process.env.ARCGIS_WO_POLE_URL,
    arcgisAuroraUrl: process.env.ARCGIS_AURORA_URL,
    arcgisClientId: process.env.ARCGIS_CLIENT_ID,
    arcgisClientSecret: process.env.ARCGIS_CLIENT_SECRET,
    arcgisTokenUrl: process.env.ARCGIS_TOKEN_URL,
    jwtSecret: process.env.JWT_SECRET,
    authUser: process.env.AUTH_USERNAME,
    authPass: process.env.AUTH_PASSWORD,
    public: {
      apiBase: '/api'
    }
  }
})
