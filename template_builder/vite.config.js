import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

/**
 * After build, moves the extracted ReactFlow CSS from the temp location
 * inside js/ to the module's css/ directory.
 */
function moveCssPlugin() {
  return {
    name: 'move-css',
    closeBundle() {
      const tempDir = path.resolve(__dirname, 'temp-css');
      const targetDir = path.resolve(__dirname, '../css');

      if (!fs.existsSync(tempDir)) {
        return;
      }

      fs.mkdirSync(targetDir, { recursive: true });

      fs.readdirSync(tempDir).forEach(file => {
        if (file.endsWith('.css')) {
          fs.renameSync(
            path.join(tempDir, file),
            path.join(targetDir, 'reactflow-canvas.css')
          );
        }
      });

      try { fs.rmdirSync(tempDir); } catch (_) {}
    },
  };
}

export default defineConfig({
  plugins: [react(), moveCssPlugin()],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
  build: {
    outDir: '.',
    emptyOutDir: false,
    minify: false,
    sourcemap: false,
    lib: {
      entry: './src/main.jsx',
      name: 'MaestroReactFlow',
      fileName: () => 'MaestroReactFlow.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        extend: true,
        assetFileNames: (assetInfo) => {
          const name = assetInfo.names?.[0] ?? '';
          if (name.endsWith('.css')) {
            return 'temp-css/[name][extname]';
          }
          return '[name][extname]';
        },
      },
    },
  },
});
