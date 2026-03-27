import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
    // assets({
    //   urlMode: 'copy', // copy the assets to the build directory and use the copied path
    //   keepName: true, // keep the original file name
    // }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `main.js`,
        chunkFileNames: `main.js`,
				assetFileNames: (assetInfo) => {
					// Vite/Rollup may provide a partially-populated assetInfo during CSS processing.
					var name = (assetInfo && (assetInfo.name || assetInfo.fileName)) || ''
					if (name && name.endsWith('.css')) {
						return `main.css`
					}
					return `assets/[name].[ext]`
				}
      }
    },
    cssCodeSplit: false,
  }
})