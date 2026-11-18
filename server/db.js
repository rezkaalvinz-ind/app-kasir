import pg from 'pg'

export const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5433/kasir'

// Postgres lokal (embedded) berjalan tanpa TLS; penyedia terkelola seperti
// Neon/Supabase/Railway mewajibkan TLS.
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)

export const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX || 10),
})
