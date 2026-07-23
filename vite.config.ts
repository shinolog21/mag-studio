import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/mag-studio/', // GitHub Pages(https://shinolog21.github.io/mag-studio/)配信用
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // 更新は「更新があります」トーストからユーザー操作で適用(要件8章)
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      workbox: {
        // アプリ本体・フォント・アイコンをすべてプリキャッシュし、機内モードでも編集・書き出しを完結させる
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      manifest: {
        name: 'MAG STUDIO',
        short_name: 'MAG STUDIO',
        description: '雑誌風画像エディタ — テンプレートに写真と文字を流し込んで誌面PNGを作る',
        lang: 'ja',
        theme_color: '#15171c',
        background_color: '#15171c',
        display: 'standalone',
        icons: [
          // base(サブパス)配信でも解決できるよう相対パスで指定
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    host: true, // 同一LANのiPhone/iPad実機検証用
  },
})
