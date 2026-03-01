import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.svg') return 'image/svg+xml'
  return 'application/octet-stream'
}

function serveAssetFile(req, res, next) {
  const url = req.url || ''
  const match = url.match(/^\/(?:medieval\/)?assets\/(.+)$/)
  if (!match) return next()

  const assetsRoot = path.resolve(process.cwd(), 'src/assets')
  const requested = decodeURIComponent(match[1]).replace(/^\/+/, '')
  const target = path.resolve(assetsRoot, requested)

  if (!(target === assetsRoot || target.startsWith(assetsRoot + path.sep))) {
    res.statusCode = 403
    res.end('Forbidden')
    return
  }

  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return next()
  }

  res.setHeader('Content-Type', contentTypeFor(target))
  fs.createReadStream(target).pipe(res)
}

// When deploying to GitHub Pages under a repository subpath
// (e.g. https://<user>.github.io/medieval/) set base to '/medieval/'.
export default defineConfig({
  base: '/medieval/',
  plugins: [
    vue(),
    {
      name: 'serve-src-assets-at-assets-path',
      configureServer(server) {
        server.middlewares.use(serveAssetFile)
      }
    }
  ],
  server: {
    host: true,
    port: 8080,
    strictPort: true
  }
})
