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
					if (assetInfo.name.endsWith('.css')) {
						return `main.css`;
					}
					return `assets/[name].[ext]`;
				}
      }
    },
    cssCodeSplit: false,
  }
})