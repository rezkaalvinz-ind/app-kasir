// Vercel Function: seluruh request /api/* dilayani aplikasi Express yang sama
// dengan yang dipakai saat lokal (server/app.js).
import app from '../server/app.js'

export default function handler(req, res) {
  // Kalau platform meneruskan path tanpa prefix /api, kembalikan prefix-nya.
  if (typeof req.url === 'string' && !req.url.startsWith('/api')) {
    req.url = req.url === '/' ? '/api' : `/api${req.url}`
  }
  return app(req, res)
}
