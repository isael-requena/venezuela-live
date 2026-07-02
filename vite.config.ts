import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Dev-only plugin that serves the same `/api/news` handler used by the Vercel
 * Function, so the serverless aggregator can be exercised through `pnpm dev`.
 */
function devNewsApi(): PluginOption {
  return {
    name: 'dev-news-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/news', (_req, res) => {
        void (async () => {
          try {
            const mod = (await server.ssrLoadModule('/api/_lib/aggregate.ts')) as {
              aggregateNews: () => Promise<unknown[]>
            }
            const items = await mod.aggregateNews()
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ items, generatedAt: Date.now() }))
          } catch (error) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ items: [], error: String(error) }))
          }
        })()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Neutralize console.* in production builds (no logs for end users); keep them
  // during dev so the dev-only logger (utils/logger) stays useful.
  define:
    mode === 'production'
      ? {
          'console.log': '(()=>{})',
          'console.error': '(()=>{})',
          'console.warn': '(()=>{})',
          'console.debug': '(()=>{})',
        }
      : {},
  plugins: [
    devNewsApi(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Venezuela en Vivo',
        short_name: 'VZLA Live',
        description: 'Sismos, dólar y noticias de Venezuela en tiempo real.',
        theme_color: '#060912',
        background_color: '#060912',
        display: 'standalone',
        lang: 'es',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache the app shell, then serve live data with network-first so the
        // app keeps working (with last-known data) when offline.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('basemaps.cartocdn.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.hostname.includes('usgs.gov') ||
              url.hostname.includes('dolarapi.com') ||
              url.hostname.includes('allorigins.win') ||
              url.hostname.includes('corsproxy.io'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'live-data',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
}))
