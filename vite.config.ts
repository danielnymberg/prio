import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Prompt användaren istället för auto-update för bättre kontroll
      registerType: 'prompt',
      // Aggressiv cache cleanup för att undvika gamla versioner
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Viktiga inställningar för stabilt service worker-beteende
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // Runtime caching med strikta regler
        runtimeCaching: [
          // API-calls ska ALDRIG cachas - alltid nätverksförst
          {
            urlPattern: /^https:\/\/api\.anthropic\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*\.speechmatics\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*\.cognitiveservices\.azure\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          // Navigering ska alltid vara nätverksförst
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24, // 24 timmar
              },
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Prio - Smart Prioritering',
        short_name: 'Prio',
        description: 'Håll fokus på det som är viktigt med CPM-modellen',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        categories: ['productivity', 'business'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174, // Different port than anmarkt-beta
    host: true,
    https: true, // Required for microphone access in production-like environment
  },
  publicDir: 'public', // Ensure public files are copied to dist
})
