// Entry point untuk server lokal (`npm run api` / `npm start`).
// Aplikasi Express-nya ada di server/app.js supaya bisa dipakai ulang
// sebagai Vercel Function di api/index.js.
import app from './app.js'

const PORT = Number(process.env.API_PORT || 3001)

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[api] Kasir API siap di http://127.0.0.1:${PORT}`)
})
