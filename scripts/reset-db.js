// Menghapus semua data dan mengisi ulang dengan seed demo.
// Pakai: npm run db:reset
import pg from 'pg'
import { seedIfEmpty } from '../server/seed.js'

const DB_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5433/kasir'

const client = new pg.Client({ connectionString: DB_URL })
await client.connect()

await client.query(`
  truncate table sale_items, sales, stock_ins, debt_entries, debts, products, customers
  restart identity cascade
`)
await client.query("select setval('trx_code_seq', 1135, false)")
const seeded = await seedIfEmpty(client)

const counts = await client.query(`
  select
    (select count(*) from products)::int as products,
    (select count(*) from sales)::int as sales,
    (select count(*) from customers)::int as customers,
    (select count(*) from debts)::int as debts
`)
await client.end()

console.log(seeded ? '[db] data direset ke seed awal' : '[db] seed tidak dijalankan (data sudah ada)')
console.log('     ', counts.rows[0])
