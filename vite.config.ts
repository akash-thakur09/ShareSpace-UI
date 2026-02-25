import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'editor': ['@tiptap/react', '@tiptap/starter-kit'],
          'fluid': ['@fluidframework/azure-client', 'fluid-framework'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
  server: {
    port: 3000,
    open: true,
  },
  preview: {
    port: 3000,
  },
})
