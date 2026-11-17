// Menjalankan PostgreSQL lokal (embedded), menyiapkan skema + seed,
// lalu menyalakan API dan Vite. Satu perintah: npm start
import EmbeddedPostgres from 'embedded-postgres'
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import pg from 'pg'
import { seedIfEmpty } from '../server/seed.js'

const PG_PORT = Number(process.env.PG_PORT || 5433)
const DB_NAME = 'kasir'
const DATA_DIR = './data/pg'
const ADMIN_URL = `postgres://postgres:postgres@127.0.0.1:${PG_PORT}/postgres`
const DB_URL = `postgres://postgres:postgres@127.0.0.1:${PG_PORT}/${DB_NAME}`

async function canConnect(url) {
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 1500 })
  try {
    await client.connect()
    await client.end()
    return true
  } catch {
    try {
      await client.end()
    } catch {}
    return false
  }
}

let cluster = null

if (await canConnect(ADMIN_URL)) {
  console.log(`[db] memakai cluster PostgreSQL yang sudah jalan di port ${PG_PORT}`)
} else {
  cluster = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: 'postgres',
    password: 'postgres',
    port: PG_PORT,
    persistent: true,
  })
  if (!existsSync(`${DATA_DIR}/PG_VERSION`)) {
    console.log('[db] inisialisasi cluster PostgreSQL pertama kali...')
    await cluster.initialise()
  }
  await cluster.start()
  console.log(`[db] PostgreSQL siap di 127.0.0.1:${PG_PORT}`)
}

const admin = new pg.Client({ connectionString: ADMIN_URL })
await admin.connect()
const exists = await admin.query('select 1 from pg_database where datname = $1', [DB_NAME])
if (exists.rowCount === 0) {
  await admin.query(`create database ${DB_NAME}`)
  console.log(`[db] database "${DB_NAME}" dibuat`)
}
await admin.end()

const client = new pg.Client({ connectionString: DB_URL })
await client.connect()
await client.query(await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8'))
const seeded = await seedIfEmpty(client)
console.log(seeded ? '[db] data awal (seed) dimasukkan' : '[db] data sudah ada, seed dilewati')
await client.end()

const api = spawn(process.execPath, ['server/index.js'], {
  env: { ...process.env, DATABASE_URL: DB_URL },
  stdio: 'inherit',
})

const vite = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173'],
  { stdio: 'inherit', env: process.env }
)

console.log('[app] API : http://127.0.0.1:3001')
console.log('[app] Web : http://localhost:5173')

let stopping = false
async function shutdown() {
  if (stopping) return
  stopping = true
  console.log('\n[app] mematikan...')
  try {
    api.kill()
    vite.kill()
  } catch {}
  if (cluster) {
    try {
      await cluster.stop()
    } catch {}
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

api.on('exit', (code) => {
  if (!stopping && code !== 0) console.error(`[api] berhenti dengan kode ${code}`)
})
