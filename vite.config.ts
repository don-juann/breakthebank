import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** serves api/*.ts during `npm run dev`, the way Vercel runs them in production */
function devApi(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\//, '')
        if (!/^[\w-]+$/.test(name)) return void ((res.statusCode = 404), res.end())
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`)
          const handler = mod[req.method ?? 'GET']
          if (typeof handler !== 'function') return void ((res.statusCode = 405), res.end())
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const headers = Object.entries(req.headers).flatMap(([k, v]) => (v == null ? [] : [[k, String(v)] as [string, string]]))
          const body = chunks.length ? Buffer.concat(chunks) : undefined
          const response: Response = await handler(new Request(`http://localhost${req.originalUrl}`, { method: req.method, headers, body }))
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (e) {
          server.ssrFixStacktrace(e as Error)
          console.error(e)
          res.statusCode = 500
          res.end('server error')
        }
      })
    },
  }
}

export default defineConfig(({ command, mode }) => {
  // the API reads DATABASE_URL from .env.local locally; Vercel injects it in production
  if (command === 'serve') Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [
      react(),
      devApi(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
        manifest: {
          name: 'Break the Bank',
          short_name: 'Break the Bank',
          description: 'Split hangout bills with friends',
          theme_color: '#efe9e1',
          background_color: '#efe9e1',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
          navigateFallbackDenylist: [/^\/api\//],
        },
      }),
    ],
  }
})
