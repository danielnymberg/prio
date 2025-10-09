import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // PWA endast i production - mycket lättare utveckling!
    ...(mode === 'production' ? [VitePWA({
      // Auto-update för snabba, pålitliga uppdateringar
      registerType: 'autoUpdate',
      // Aggressiv cache cleanup för att undvika gamla versioner
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Viktiga inställningar för stabilt service worker-beteende
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // Inactivate gamla service workers omedelbart
        inlineWorkboxRuntime: true,
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
          // Microsoft OAuth (login.microsoftonline.com)
          {
            urlPattern: /^https:\/\/login\.microsoftonline\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          // Navigering ska alltid vara nätverksförst med kort timeout
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60, // Endast 1 timme
              },
              networkTimeoutSeconds: 2,
            },
          },
        ],
      },
      includeAssets: ['favicon.svg'],
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
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        categories: ['productivity', 'business'],
        shortcuts: [
          {
            name: 'Ny task',
            short_name: 'Ny',
            description: 'Skapa task snabbt',
            url: '/?action=quick',
          },
          {
            name: 'Inbox',
            short_name: 'Inbox',
            description: 'Granska tasks',
            url: '/inbox',
          },
          {
            name: 'Just Nu',
            short_name: 'Focus',
            description: 'Fokusläge',
            url: '/focus',
          },
        ],
        share_target: {
          action: '/share',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
      },
    })] : []),
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
  build: {
    chunkSizeWarningLimit: 1000, // Increase limit to 1000 kB
    rollupOptions: {
      output: {
        manualChunks: {
          // Separera stora vendor libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'calendar': ['react-big-calendar', 'date-fns', 'react-dnd', 'react-dnd-html5-backend'],
          'supabase': ['@supabase/supabase-js'],
          'microsoft': ['@azure/msal-browser', '@microsoft/microsoft-graph-client'],
        },
      },
    },
  },
  publicDir: 'public', // Ensure public files are copied to dist
}))
