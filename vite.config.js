import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// When deploying to GitHub Pages under a repository subpath
// (e.g. https://<user>.github.io/medieval/) set base to '/medieval/'.
export default defineConfig({
  base: '/medieval/',
  plugins: [vue()]
})
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()]
})
