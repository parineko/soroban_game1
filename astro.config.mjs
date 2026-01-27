// astro.config.mjs
import { defineConfig } from 'astro/config';
import AstroPWA from '@vite-pwa/astro';

export default defineConfig({
  integrations: [
    AstroPWA({
      registerType: 'autoUpdate',
      // ★修正: フォントファイル(.woff)や画像(.png)もアセットとして含める
      includeAssets: ['favicon.svg', 'ABACUS2.woff', 'images/*.png'], 
      manifest: {
        name: 'そろばん くくゲーム',
        short_name: 'くくゲーム',
        description: 'そろばんで九九をおぼえるゲーム',
        theme_color: '#faf8f5',
        background_color: '#faf8f5',
        display: 'standalone',
        orientation: 'any', // 縦横両対応
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // ★修正: woffファイルもキャッシュ対象パターンに明示的に追加
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: null,
        
        runtimeCaching: [
          {
            // GoogleフォントのCSS（リスト）を保存
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate', // CacheFirstより更新に強い設定に変更
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1年間保存
              }
            }
          },
          {
            // Googleフォントのファイル本体（中身）を保存
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
      }
    })
  ],
});