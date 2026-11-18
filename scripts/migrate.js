// Menyiapkan database PostgreSQL tujuan deploy (Neon/Supabase/Railway).
//
//   DATABASE_URL="postgres://user:pass@host/db?sslmode=require" npm run db:migrate
//
// Yang dilakukan: menerapkan server/schema.sql (idempotent), memastikan baris
// pengaturan toko ada, dan membuat akun pemilik pertama bila belum ada user.
import { readFile } from 'node:fs/promises'
import pg from 'pg'
import { hashPassword } from '../server/auth.js'
import { seedIfEmpty } from '../server/seed.js'

const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL

if (!connectionString) {
  console.error('[migrate] DATABASE_URL belum diisi. Contoh:')
  console.error('  DATABASE_URL="postgres://user:pass@host/db?sslmode=require" npm run db:migrate')
  process.exit(1)
}

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)
const client = new pg.Client({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
})

const mask = connectionString.replace(/:\/\/[^@]*@/, '://***@')

async function main() {
  await client.connect()
  console.log(`[migrate] terhubung ke ${mask}`)

  const schema = await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8')
  await client.query(schema)
  console.log('[migrate] skema diterapkan')

  await client.query(
    `insert into settings (id, store_name) values (1, 'Toko Saya') on conflict (id) do nothing`
  )

  const users = await client.query('select count(*)::int as n from users')
  if (users.rows[0].n === 0) {
    const name = process.env.OWNER_NAME || 'Pemilik Toko'
    const username = (process.env.OWNER_USERNAME || 'pemilik').toLowerCase()
    const password = process.env.OWNER_PASSWORD || 'kasir123'
    await client.query(
      `insert into users (name, username, password_hash, role) values ($1, $2, $3, 'owner')`,
      [name, username, hashPassword(password)]
    )
    console.log(`[migrate] akun pemilik dibuat: ${username} / ${password}`)
    if (!process.env.OWNER_PASSWORD) {
      console.log('[migrate] PERINGATAN: masih memakai password bawaan — segera ganti.')
    }
  } else {
    console.log(`[migrate] sudah ada ${users.rows[0].n} akun, tidak membuat akun baru`)
  }

  const tables = await client.query(
    `select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`
  )
  console.log('[migrate] tabel:', tables.rows.map((r) => r.table_name).join(', '))

  // Data contoh (produk, transaksi, utang) opsional: SEED_DEMO=1 npm run db:migrate
  if (process.env.SEED_DEMO === '1') {
    const seeded = await seedIfEmpty(client)
    console.log(`[migrate] data contoh ${seeded ? 'dibuat' : 'dilewati (produk sudah ada)'}`)
  }
}

main()
  .then(() => client.end())
  .catch(async (err) => {
    console.error('[migrate] gagal:', err.message)
    await client.end().catch(() => {})
    process.exit(1)
  })
