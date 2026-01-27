// astro.config.mjs
import { defineConfig } from 'astro/config';
import AstroPWA from '@vite-pwa/astro';

export default defineConfig({
  // 既存の設定があればここに追加
  integrations: [
    AstroPWA({
      registerType: 'autoUpdate', // 更新があったら自動で入れ替える
      includeAssets: ['favicon.svg'], // キャッシュしたい静的ファイル
      manifest: {
        name: 'そろばん くくゲーム',
        short_name: 'くくゲーム',
        description: 'そろばんで九九をおぼえるゲーム',
        theme_color: '#faf8f5',
        background_color: '#faf8f5',
        display: 'standalone', // 上のアドレスバーを消す
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
        // ★ここ重要：HTML, CSS, JS, 画像を全部保存する設定
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // エラー時の対策
        navigateFallback: null, 
      }
    })
  ],
});