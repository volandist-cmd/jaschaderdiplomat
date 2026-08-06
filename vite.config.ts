import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  server: {
    // Fixed port so the persistent launchd-managed dev server (see
    // ~/Library/LaunchAgents/com.jaschaderdiplomat.devserver.plist) always answers at the same
    // URL instead of silently drifting to 5174/5175/... if the port was briefly taken on restart.
    port: 5173,
    strictPort: true
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunk for core dependencies
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('pinia')) {
              return 'vendor'
            }
          }
          // Data files will be chunked separately when they are imported (Week 2)
          if (id.includes('/data/')) {
            if (id.includes('recht')) return 'data-recht'
            if (id.includes('geschichte')) return 'data-geschichte'
            if (id.includes('wirtschaft')) return 'data-wirtschaft'
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
