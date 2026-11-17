import pg from 'pg'

export const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5433/kasir'

export const pool = new pg.Pool({ connectionString, max: 10 })
