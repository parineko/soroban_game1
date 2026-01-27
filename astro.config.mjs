// astro.config.mjs
import { defineConfig } from 'astro/config';
import AstroPWA from '@vite-pwa/astro';

export default defineConfig({
  integrations: [
    AstroPWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'そろばん くくゲーム',
        short_name: 'くくゲーム',
        description: 'そろばんで九九をおぼえるゲーム',
        theme_color: '#faf8f5',
        background_color: '#faf8f5',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: null,
        
        // ★★★ ここから追加（フォントを保存する設定） ★★★
        runtimeCaching: [
          {
            // GoogleフォントのCSS（リスト）を保存
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1年間保存
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // フォントのファイル本体（中身）を保存
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1年間保存
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
        // ★★★ ここまで追加 ★★★
      }
    })
  ],
});