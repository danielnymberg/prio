import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
// import { VitePWA } from 'vite-plugin-pwa' // PWA DISABLED

export default defineConfig(() => ({
  plugins: [
    react(),
    // PWA DISABLED - service worker orsakar caching-problem under utveckling
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
          'calendar': ['@syncfusion/ej2-react-schedule', '@syncfusion/ej2-react-calendars'],
          'supabase': ['@supabase/supabase-js'],
          'microsoft': ['@azure/msal-browser', '@microsoft/microsoft-graph-client'],
        },
      },
    },
  },
  publicDir: 'public', // Ensure public files are copied to dist
}))
