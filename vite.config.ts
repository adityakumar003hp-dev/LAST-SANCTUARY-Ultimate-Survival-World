import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'favicon-32x32.png',
          'apple-touch-icon.png',
          'og-image.jpg',
          'robots.txt',
          'sitemap.xml',
          'sitemap.html',
          'guide.html',
          'about.html',
          'google0f721de826ab34a3.html',
        ],
        manifest: {
          id: '/',
          name: 'LAST SANCTUARY: Ultimate Survival World',
          short_name: 'LAST SANCTUARY',
          description:
            'Explore a 3D open-world survival game with zombie threats, wildlife, vehicles, sanctuary building and defence, survivor interactions, and railway travel.',
          theme_color: '#09090b',
          background_color: '#09090b',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          categories: ['games', 'adventure', 'role-playing'],
          screenshots: [
            {
              src: '/og-image.jpg',
              sizes: '1200x630',
              type: 'image/jpeg',
              form_factor: 'wide',
              label: 'LAST SANCTUARY: Ultimate Survival World — 3D open-world survival game',
            },
          ],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff,woff2}'],
          navigateFallbackDenylist: [
            /^\/sitemap\.xml$/,
            /^\/sitemap\.html$/,
            /^\/guide\.html$/,
            /^\/about\.html$/,
            /^\/robots\.txt$/,
            /^\/google[a-z0-9]+\.html$/,
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) return 'three-vendor';
            if (id.includes('node_modules/lucide-react')) return 'ui-icons';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
