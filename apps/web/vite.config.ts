import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      { find: /^@better-auth\/core\/utils\/(.*)/, replacement: path.resolve(__dirname, './node_modules/@better-auth/core/dist/utils/$1.mjs') },
      { find: '@better-auth/core/env', replacement: path.resolve(__dirname, './node_modules/@better-auth/core/dist/env/index.mjs') },
      { find: '@better-auth/core/error', replacement: path.resolve(__dirname, './node_modules/@better-auth/core/dist/error/index.mjs') },
      { find: '@better-auth/core/context', replacement: path.resolve(__dirname, './node_modules/@better-auth/core/dist/context/index.mjs') },
      { find: '@better-auth/core/api', replacement: path.resolve(__dirname, './node_modules/@better-auth/core/dist/api/index.mjs') },
      { find: '@better-auth/core', replacement: path.resolve(__dirname, './node_modules/@better-auth/core/dist/index.mjs') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ]
  },
  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
