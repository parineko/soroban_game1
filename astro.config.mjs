// astro.config.mjs
import { defineConfig } from 'astro/config';
import AstroPWA from '@vite-pwa/astro'; // ★追加

export default defineConfig({
  // ...他の設定があれば維持...
  integrations: [
    AstroPWA({
      registerType: 'autoUpdate', // 更新があったら自動で入れ替える
      manifest: {
        name: 'そろばん くくゲーム',
        short_name: 'くくゲーム',
        description: 'そろばんで九九をおぼえるゲーム',
        theme_color: '#faf8f5',
        background_color: '#faf8f5',
        display: 'standalone', // ブラウザのバーを消してアプリっぽく
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg', // publicフォルダにあるアイコン
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
        // 画像やCSS、HTMLを全部スマホに保存する設定
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: null,
      }
    })
  ],
});