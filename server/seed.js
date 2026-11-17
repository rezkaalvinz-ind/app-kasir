// Seed data awal. Data transaksi hanya jika tabel products masih kosong.
// Akun pemilik + pengaturan toko dipastikan ada setiap kali dijalankan.
import { hashPassword } from './auth.js'

const DEFAULT_USER = { name: 'Bu Sari', username: 'pemilik', password: 'kasir123' }

const at = (offsetDays, h = 10, m = 0) => {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  return d
}

const PRODUCTS = [
  ['Indomie Goreng', 'Makanan', 3500, 3000, 2, 10, 'pcs'],
  ['Gula 1 kg', 'Sembako', 16000, 14000, 2, 5, 'pcs'],
  ['Teh Botol 350 ml', 'Minuman', 5000, 4000, 20, 12, 'pcs'],
  ['Kopi Sachet', 'Minuman', 2000, 1500, 40, 20, 'pcs'],
  ['Sabun Lifebuoy', 'Sembako', 4500, 3600, 3, 6, 'pcs'],
  ['Air Mineral 600 ml', 'Minuman', 4000, 2800, 4, 12, 'pcs'],
]

const CUSTOMERS = [
  ['Pak Rudi', '0812-3456-7890'],
  ['Bu Nita', '0813-2233-4455'],
  ['Dika (kos 12)', '0857-1122-3344'],
]

// [kode, tanggal, [[index produk, qty]], metode, cash]
const SALES = [
  [1135, at(-6, 9, 15), [[0, 18], [2, 12]], 'tunai', 123000],
  [1136, at(-5, 11, 40), [[1, 9], [3, 30]], 'tunai', 204000],
  [1137, at(-4, 8, 25), [[2, 6]], 'qris', 0],
  [1138, at(-3, 14, 5), [[1, 12], [0, 24]], 'tunai', 276000],
  [1139, at(-2, 10, 30), [[3, 60], [5, 18]], 'qris', 0],
  [1140, at(-1, 9, 0), [[1, 9]], 'tunai', 144000],
  [1141, at(-1, 16, 20), [[2, 12], [4, 6]], 'tunai', 87000],
  [1142, at(0, 8, 1), [[0, 6], [2, 3]], 'tunai', 50000],
  [1143, at(0, 9, 20), [[1, 3], [3, 15]], 'tunai', 100000],
  [1144, at(0, 13, 45), [[2, 9]], 'qris', 0],
]

export async function seedIfEmpty(client) {
  // Pengaturan toko: pastikan barisnya ada (idempoten)
  await client.query(
    `insert into settings (id, store_name) values (1, 'Toko Bu Sari') on conflict (id) do nothing`
  )

  // Akun pemilik default dibuat hanya jika belum ada user sama sekali
  const users = await client.query('select count(*)::int as n from users')
  if (users.rows[0].n === 0) {
    await client.query(
      `insert into users (name, username, password_hash, role) values ($1, $2, $3, 'owner')`,
      [DEFAULT_USER.name, DEFAULT_USER.username, hashPassword(DEFAULT_USER.password)]
    )
    console.log(`[seed] akun awal dibuat: ${DEFAULT_USER.username} / ${DEFAULT_USER.password}`)
  }

  const { rows } = await client.query('select count(*)::int as n from products')
  if (rows[0].n > 0) return false

  await client.query('begin')

  const productIds = []
  for (const p of PRODUCTS) {
    const res = await client.query(
      `insert into products (name, category, price, cost, stock, min_stock, unit)
       values ($1, $2, $3, $4, $5, $6, $7) returning id, price, cost, name`,
      p
    )
    productIds.push(res.rows[0])
  }

  const customerIds = []
  for (const c of CUSTOMERS) {
    const res = await client.query('insert into customers (name, phone) values ($1, $2) returning id', c)
    customerIds.push(res.rows[0].id)
  }

  for (const [code, date, items, method, cash] of SALES) {
    const total = items.reduce((sum, [idx, qty]) => sum + productIds[idx].price * qty, 0)
    const sale = await client.query(
      `insert into sales (code, created_at, method, total, cash, change)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [`#TRX-${code}`, date, method, total, method === 'tunai' ? cash : 0, Math.max(0, cash - total)]
    )
    for (const [idx, qty] of items) {
      const p = productIds[idx]
      await client.query(
        `insert into sale_items (sale_id, product_id, product_name, price, cost, qty)
         values ($1, $2, $3, $4, $5, $6)`,
        [sale.rows[0].id, p.id, p.name, p.price, p.cost, qty]
      )
    }
  }

  await client.query("select setval('trx_code_seq', 1144, true)")

  await client.query(
    `insert into stock_ins (product_id, qty, cost, date, supplier, as_expense)
     values ($1, 6, 14000, $2, 'Grosir Maju Jaya', true)`,
    [productIds[1].id, at(-1, 9, 0)]
  )

  // Utang: Pak Rudi (telat), Bu Nita (cicilan), Dika (jatuh tempo dekat)
  const debts = [
    {
      customer: customerIds[0],
      due: at(-7, 12, 0),
      entries: [
        ['belanja', at(-15, 10, 0), 110000, 'Gula 1 kg × 2, Indomie × 4', null],
        ['bayar', at(-11, 16, 0), 125000, null, 'Tunai'],
        ['belanja', at(-9, 11, 0), 200000, 'Teh Botol × 3, Kopi Sachet × 5', null],
      ],
    },
    {
      customer: customerIds[1],
      due: at(21, 12, 0),
      entries: [
        ['belanja', at(-12, 9, 0), 240000, 'Belanja bulanan', null],
        ['bayar', at(-5, 15, 0), 60000, null, 'Tunai'],
        ['bayar', at(-2, 15, 0), 60000, null, 'Tunai'],
      ],
    },
    {
      customer: customerIds[2],
      due: at(3, 12, 0),
      entries: [['belanja', at(-8, 17, 0), 180000, '3 transaksi', null]],
    },
  ]

  for (const d of debts) {
    const debt = await client.query(
      'insert into debts (customer_id, due_date) values ($1, $2) returning id',
      [d.customer, d.due]
    )
    for (const [type, date, amount, note, method] of d.entries) {
      await client.query(
        `insert into debt_entries (debt_id, type, date, amount, note, method)
         values ($1, $2, $3, $4, $5, $6)`,
        [debt.rows[0].id, type, date, amount, note, method]
      )
    }
  }

  await client.query('commit')
  return true
}
