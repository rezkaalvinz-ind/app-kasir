import pg from 'pg'

// Vercel/Neon menaruh connection string di nama env yang berbeda-beda.
export const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  'postgres://postgres:postgres@127.0.0.1:5433/kasir'

// Postgres lokal (embedded) berjalan tanpa TLS; penyedia terkelola seperti
// Neon/Supabase/Railway mewajibkan TLS.
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)

export const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
  // Serverless: tiap instance punya pool sendiri, jadi jangan terlalu besar.
  max: Number(process.env.PG_POOL_MAX || (isLocal ? 10 : 3)),
})
