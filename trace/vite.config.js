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
            path.join(targetDir, 'trace-viewer-canvas.css')
          );
        }
      });

      try { fs.rmdirSync(tempDir); } catch (_) {}
    },
  };
}

export default defineConfig({
  plugins: [react(), moveCssPlugin()],
  resolve: {
    // TaskNode.jsx/MaestroEdge.jsx are imported by relative path from the
    // sibling maestro_reactflow_template_builder module, which has its own
    // independently-installed node_modules. Without this alias, Vite
    // resolves react/react-dom/@xyflow/react for those files against that
    // sibling's node_modules (a physically separate copy, potentially even
    // a different resolved version), producing a second React/ReactFlow
    // instance in the same bundle -- @xyflow/react's Zustand-backed context
    // then doesn't match between ReactFlowProvider and the node/edge
    // components, throwing "Seems like you have not used zustand provider
    // as an ancestor" (reactflow.dev/error#001) at runtime. Aliasing forces
    // every import site, regardless of which directory the importing file
    // physically lives in, to resolve to this project's single copy.
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@xyflow/react': path.resolve(__dirname, 'node_modules/@xyflow/react'),
    },
  },
  define: {
    'process.env.NODE_ENV': process.env.VITEST ? '"development"' : '"production"',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
  },
  build: {
    outDir: '.',
    emptyOutDir: false,
    minify: false,
    sourcemap: false,
    lib: {
      entry: './src/main.jsx',
      name: 'MaestroTraceViewer',
      fileName: () => 'MaestroTraceViewer.js',
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
