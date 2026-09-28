import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // react-pdf 9.2 pins pdfjs-dist 4.8 internally. Without dedupe the app loads the worker from the
  // hoisted 4.10 build and pdf.js rejects it as "API version not supported", so the page never renders.
  resolve: { dedupe: ['pdfjs-dist', 'react-pdf'] },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // The map engine and the schema validator change on a different cadence to the product
        // screens, so they are cached apart from the app chunk instead of invalidating it.
        manualChunks(id) {
          // Vite's preload helper belongs to the initial graph. If it lands in a lazy chunk, the
          // entry has to import that chunk statically and the split is undone.
          if (id.includes('preload-helper') || id.includes('modulepreload-polyfill')) return 'vendor'
          if (!id.includes('node_modules')) return
          // Mapbox GL JS is the map engine and the data layers are drawn inside its GL context,
          // so the two ship as one chunk: splitting them would load deck.gl for nothing.
          if (id.includes('mapbox-gl') || id.includes('deck.gl')) return 'mapbox'
          if (
            id.includes('@math.gl') ||
            id.includes('@luma.gl') ||
            id.includes('@vis.gl') ||
            id.includes('@loaders.gl') ||
            id.includes('mjolnir.js')
          ) {
            return 'map-engine'
          }
          if (id.includes('zod')) return 'schema'
          if (id.includes('react-pdf') || id.includes('pdfjs-dist')) return 'pdf'
          if (id.includes('cytoscape')) return 'graph'
          // Three.js is only reached through the landing section's dynamic import, and it is
          // most of a megabyte on its own. Left in `vendor` it would be pulled into the first
          // paint and the hero's own chunk would never be worth splitting.
          if (id.includes('/three/')) return 'three'
          return 'vendor'
        },
      },
    },
  },
})
