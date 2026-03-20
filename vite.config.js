import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 4177,
    proxy: {
      '/api': 'http://localhost:4178',
    },
  },
  test: {
    include: ['src/**/*.test.mjs', 'src/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/server/**/*.mjs'],
      thresholds: {
        lines: 70,
        branches: 70,
        functions: 70,
        statements: 70,
      },
    },
  },
})
