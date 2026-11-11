import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mi Vehículo · Control total',
        short_name: 'Mi Vehículo',
        description: 'Controla combustible, mantenimientos, documentos, multas, lavadas y alertas de tu vehículo.',
        lang: 'es-CO',
        theme_color: '#0a0e1a',
        background_color: '#0a0e1a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'Registrar tanqueada', url: './#/fuel?new=1', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
          { name: 'Ver alertas', url: './#/alerts', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]?\.?tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 } }
          },
          {
            urlPattern: /^https:\/\/(cdn\.jsdelivr\.net|tessdata\.projectnaptha\.com)\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'ocr-engine', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 90 } }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ]
});
