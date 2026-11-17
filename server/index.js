import express from 'express'
import { pool, connectionString } from './db.js'
import { verifyPassword, newToken, hashPassword } from './auth.js'

const app = express()
const PORT = Number(process.env.API_PORT || 3001)

app.use(express.json({ limit: '256kb' }))

// Sesi login disimpan di memori (hilang saat API di-restart → login ulang).
const sessions = new Map() // token -> { id, name, username, role }

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next)
const bad = (res, message, status = 400) => res.status(status).json({ error: message })
const int = (v) => Math.round(Number(v) || 0)

const mapProduct = (r) => ({
  id: r.id,
  name: r.name,
  category: r.category,
  price: r.price,
  cost: r.cost,
  stock: r.stock,
  minStock: r.min_stock,
  unit: r.unit,
})

const mapCustomer = (r) => ({ id: r.id, name: r.name, phone: r.phone })

const mapSale = (r, items) => ({
  id: r.id,
  code: r.code,
  date: r.created_at,
  method: r.method,
  total: r.total,
  cash: r.cash,
  change: r.change,
  customerId: r.customer_id,
  items,
})

/* --------------------------------- auth --------------------------------- */
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('select 1')
    res.json({ ok: true, db: connectionString.replace(/:\/\/[^@]*@/, '://***@') })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.post(
  '/api/login',
  wrap(async (req, res) => {
    const { username, password } = req.body || {}
    if (!username || !password) return bad(res, 'Isi username dan password.')

    const found = await pool.query('select * from users where lower(username) = lower($1)', [
      String(username).trim(),
    ])
    const user = found.rows[0]
    if (!user || !verifyPassword(String(password), user.password_hash)) {
      return bad(res, 'Username atau password salah.', 401)
    }

    const token = newToken()
    const info = { id: user.id, name: user.name, username: user.username, role: user.role }
    sessions.set(token, info)
    res.json({ token, user: info })
  })
)

app.post(
  '/api/register',
  wrap(async (req, res) => {
    const { name, username, password } = req.body || {}
    if (typeof name !== 'string' || name.trim().length < 2) return bad(res, 'Nama minimal 2 karakter.')

    const uname = String(username || '').trim().toLowerCase()
    if (uname.length < 3) return bad(res, 'Username minimal 3 karakter.')
    if (!/^[a-z0-9_.]+$/.test(uname)) {
      return bad(res, 'Username hanya boleh huruf kecil, angka, titik, dan underscore.')
    }
    if (typeof password !== 'string' || password.length < 6) return bad(res, 'Password minimal 6 karakter.')

    const dup = await pool.query('select 1 from users where lower(username) = $1', [uname])
    if (dup.rowCount > 0) return bad(res, 'Username sudah dipakai. Coba yang lain.', 409)

    // Akun pertama menjadi pemilik; akun berikutnya menjadi staf.
    const count = await pool.query('select count(*)::int as n from users')
    const role = count.rows[0].n === 0 ? 'owner' : 'staff'

    const created = await pool.query(
      'insert into users (name, username, password_hash, role) values ($1, $2, $3, $4) returning id, name, username, role',
      [name.trim(), uname, hashPassword(password), role]
    )
    const user = created.rows[0]
    const token = newToken()
    sessions.set(token, user)
    res.status(201).json({ token, user })
  })
)

app.post('/api/logout', (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (token) sessions.delete(token)
  res.json({ ok: true })
})

/* Semua endpoint data di bawah ini butuh sesi login. */
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const user = token && sessions.get(token)
  if (!user) return res.status(401).json({ error: 'Sesi berakhir. Silakan login lagi.' })
  req.user = user
  next()
}

app.use('/api', requireAuth)

/* ------------------------------- bootstrap ------------------------------- */
app.get(
  '/api/bootstrap',
  wrap(async (req, res) => {
    const [products, customers, sales, items, stockIns, debts, entries, settings] = await Promise.all([
      pool.query('select * from products order by id'),
      pool.query('select * from customers order by id'),
      pool.query('select * from sales order by created_at, id'),
      pool.query('select * from sale_items order by id'),
      pool.query('select * from stock_ins order by date, id'),
      pool.query('select * from debts order by due_date'),
      pool.query('select * from debt_entries order by date, id'),
      pool.query('select * from settings where id = 1'),
    ])

    const itemsBySale = new Map()
    for (const it of items.rows) {
      if (!itemsBySale.has(it.sale_id)) itemsBySale.set(it.sale_id, [])
      itemsBySale.get(it.sale_id).push({
        id: it.product_id,
        qty: it.qty,
        name: it.product_name,
        price: it.price,
        cost: it.cost,
      })
    }

    const entriesByDebt = new Map()
    for (const e of entries.rows) {
      if (!entriesByDebt.has(e.debt_id)) entriesByDebt.set(e.debt_id, [])
      entriesByDebt.get(e.debt_id).push({
        id: e.id,
        type: e.type,
        date: e.date,
        amount: e.amount,
        note: e.note,
        method: e.method,
      })
    }

    res.json({
      products: products.rows.map(mapProduct),
      customers: customers.rows.map(mapCustomer),
      sales: sales.rows.map((r) => mapSale(r, itemsBySale.get(r.id) || [])),
      stockIns: stockIns.rows.map((r) => ({
        id: r.id,
        productId: r.product_id,
        qty: r.qty,
        cost: r.cost,
        date: r.date,
        supplier: r.supplier,
        asExpense: r.as_expense,
        initial: r.initial,
      })),
      debts: debts.rows.map((r) => ({
        id: r.id,
        customerId: r.customer_id,
        dueDate: r.due_date,
        entries: entriesByDebt.get(r.id) || [],
      })),
      settings: settings.rows[0]
        ? { storeName: settings.rows[0].store_name }
        : { storeName: 'Toko Saya' },
      me: req.user,
    })
  })
)

/* -------------------------------- products -------------------------------- */
app.post(
  '/api/products',
  wrap(async (req, res) => {
    const { name, category, price, cost, stock, minStock, unit } = req.body || {}
    if (typeof name !== 'string' || name.trim().length < 2) return bad(res, 'Nama produk minimal 2 karakter.')
    if (int(price) <= 0) return bad(res, 'Harga jual wajib diisi.')
    if (int(cost) < 0 || int(stock) < 0 || int(minStock) < 0) return bad(res, 'Angka tidak boleh negatif.')

    const client = await pool.connect()
    try {
      await client.query('begin')
      const created = await client.query(
        `insert into products (name, category, price, cost, stock, min_stock, unit)
         values ($1, $2, $3, $4, $5, $6, $7) returning *`,
        [
          name.trim(),
          (category || 'Lainnya').trim(),
          int(price),
          int(cost),
          int(stock),
          int(minStock),
          unit || 'pcs',
        ]
      )
      const product = created.rows[0]
      if (product.stock > 0) {
        await client.query(
          `insert into stock_ins (product_id, qty, cost, date, supplier, as_expense, initial)
           values ($1, $2, $3, now(), '', false, true)`,
          [product.id, product.stock, product.cost]
        )
      }
      await client.query('commit')
      res.status(201).json({ product: mapProduct(product) })
    } catch (err) {
      await client.query('rollback')
      throw err
    } finally {
      client.release()
    }
  })
)

app.patch(
  '/api/products/:id',
  wrap(async (req, res) => {
    const id = int(req.params.id)
    const { name, category, price, cost, minStock, unit } = req.body || {}
    if (typeof name !== 'string' || name.trim().length < 2) return bad(res, 'Nama produk minimal 2 karakter.')
    if (int(price) <= 0) return bad(res, 'Harga jual wajib diisi.')
    if (int(cost) < 0 || int(minStock) < 0) return bad(res, 'Angka tidak boleh negatif.')

    const updated = await pool.query(
      `update products set name = $1, category = $2, price = $3, cost = $4, min_stock = $5, unit = $6
       where id = $7 returning *`,
      [name.trim(), (category || 'Lainnya').trim(), int(price), int(cost), int(minStock), unit || 'pcs', id]
    )
    if (updated.rowCount === 0) return bad(res, 'Produk tidak ditemukan.', 404)
    res.json({ product: mapProduct(updated.rows[0]) })
  })
)

app.delete(
  '/api/products/:id',
  wrap(async (req, res) => {
    const id = int(req.params.id)
    // Produk yang punya riwayat tidak boleh dihapus agar laporan tetap akurat.
    const used = await pool.query(
      `select
         (select count(*)::int from sale_items where product_id = $1) as sales,
         (select count(*)::int from stock_ins where product_id = $1) as stock_ins`,
      [id]
    )
    if (used.rows[0].sales > 0 || used.rows[0].stock_ins > 0) {
      return bad(res, 'Produk sudah punya riwayat transaksi atau barang masuk sehingga tidak bisa dihapus.', 409)
    }
    const del = await pool.query('delete from products where id = $1', [id])
    if (del.rowCount === 0) return bad(res, 'Produk tidak ditemukan.', 404)
    res.json({ ok: true })
  })
)

/* -------------------------------- customers -------------------------------- */
app.post(
  '/api/customers',
  wrap(async (req, res) => {
    const { name, phone } = req.body || {}
    if (typeof name !== 'string' || name.trim().length < 2) return bad(res, 'Nama pelanggan minimal 2 karakter.')
    const digits = String(phone || '').replace(/\D/g, '')
    if (digits.length < 8) return bad(res, 'Nomor HP minimal 8 digit.')

    const { rows } = await pool.query(
      'insert into customers (name, phone) values ($1, $2) returning *',
      [name.trim(), phone]
    )
    res.status(201).json({ customer: mapCustomer(rows[0]) })
  })
)

/* ------------------------------- stok masuk ------------------------------- */
app.post(
  '/api/stock-ins',
  wrap(async (req, res) => {
    const { productId, qty, cost, date, supplier, asExpense } = req.body || {}
    if (int(qty) <= 0) return bad(res, 'Jumlah masuk minimal 1.')
    if (int(cost) <= 0) return bad(res, 'Harga beli per pcs wajib diisi.')

    const client = await pool.connect()
    try {
      await client.query('begin')
      const found = await client.query('select * from products where id = $1 for update', [int(productId)])
      if (found.rowCount === 0) {
        await client.query('rollback')
        return bad(res, 'Produk tidak ditemukan.', 404)
      }
      // Harga beli produk di-update memakai rata-rata bergerak (stok lama + barang masuk),
      // supaya perhitungan laba di laporan selalu mengikuti harga beli terkini.
      const oldProduct = found.rows[0]
      const newStock = oldProduct.stock + int(qty)
      const avgCost =
        newStock > 0
          ? Math.round((oldProduct.stock * oldProduct.cost + int(qty) * int(cost)) / newStock)
          : int(cost)
      const updated = await client.query(
        'update products set stock = stock + $1, cost = $2 where id = $3 returning *',
        [int(qty), avgCost, int(productId)]
      )
      await client.query(
        `insert into stock_ins (product_id, qty, cost, date, supplier, as_expense)
         values ($1, $2, $3, $4, $5, $6)`,
        [int(productId), int(qty), int(cost), date ? new Date(date) : new Date(), supplier || '', !!asExpense]
      )
      await client.query('commit')
      res.status(201).json({ product: mapProduct(updated.rows[0]) })
    } catch (err) {
      await client.query('rollback')
      throw err
    } finally {
      client.release()
    }
  })
)

/* -------------------------------- checkout -------------------------------- */
app.post(
  '/api/checkout',
  wrap(async (req, res) => {
    const { method, cash = 0, change = 0, customerId = null, items } = req.body || {}
    if (!['tunai', 'qris', 'utang'].includes(method)) return bad(res, 'Metode pembayaran tidak dikenal.')
    if (!Array.isArray(items) || items.length === 0) return bad(res, 'Keranjang masih kosong.')
    if (items.some((it) => int(it.qty) <= 0)) return bad(res, 'Jumlah item tidak valid.')
    if (method === 'utang' && !customerId) return bad(res, 'Pilih pelanggan untuk mencatat utang.')

    const client = await pool.connect()
    try {
      await client.query('begin')

      const ids = [...new Set(items.map((it) => int(it.productId)))]
      const found = await client.query('select * from products where id = any($1::int[]) for update', [ids])
      if (found.rowCount !== ids.length) {
        await client.query('rollback')
        return bad(res, 'Ada produk yang tidak ditemukan.', 404)
      }
      const byId = new Map(found.rows.map((p) => [p.id, p]))

      for (const it of items) {
        const p = byId.get(int(it.productId))
        if (p.stock < int(it.qty)) {
          await client.query('rollback')
          return bad(res, `Stok ${p.name} tinggal ${p.stock}.`, 409)
        }
      }

      const total = items.reduce((sum, it) => sum + byId.get(int(it.productId)).price * int(it.qty), 0)
      if (method === 'tunai' && int(cash) < total) {
        await client.query('rollback')
        return bad(res, 'Uang diterima kurang dari total belanja.')
      }

      const codeRes = await client.query("select '#TRX-' || nextval('trx_code_seq')::text as code")
      const saleRes = await client.query(
        `insert into sales (code, method, total, cash, change, customer_id)
         values ($1, $2, $3, $4, $5, $6) returning *`,
        [codeRes.rows[0].code, method, total, int(cash), method === 'tunai' ? int(change) : 0, customerId || null]
      )
      const sale = saleRes.rows[0]

      const saleItems = []
      for (const it of items) {
        const p = byId.get(int(it.productId))
        await client.query(
          `insert into sale_items (sale_id, product_id, product_name, price, cost, qty)
           values ($1, $2, $3, $4, $5, $6)`,
          [sale.id, p.id, p.name, p.price, p.cost, int(it.qty)]
        )
        await client.query('update products set stock = stock - $1 where id = $2', [int(it.qty), p.id])
        saleItems.push({ id: p.id, qty: int(it.qty), name: p.name, price: p.price, cost: p.cost })
      }

      if (method === 'utang') {
        const debt = await client.query(
          `insert into debts (customer_id, due_date)
           values ($1, now() + interval '14 days')
           on conflict (customer_id) do update set due_date = excluded.due_date
           returning id`,
          [int(customerId)]
        )
        const note = saleItems.map((it) => `${it.name} × ${it.qty}`).join(', ')
        await client.query(
          `insert into debt_entries (debt_id, type, date, amount, note)
           values ($1, 'belanja', now(), $2, $3)`,
          [debt.rows[0].id, total, note]
        )
      }

      await client.query('commit')
      res.status(201).json({ sale: mapSale(sale, saleItems) })
    } catch (err) {
      await client.query('rollback')
      throw err
    } finally {
      client.release()
    }
  })
)

/* ---------------------------------- utang ---------------------------------- */
app.post(
  '/api/debts',
  wrap(async (req, res) => {
    const { customerId, amount, dueDate, note } = req.body || {}
    if (!customerId) return bad(res, 'Pilih pelanggan dulu.')
    if (int(amount) <= 0) return bad(res, 'Jumlah utang wajib diisi.')

    const client = await pool.connect()
    try {
      await client.query('begin')
      const debt = await client.query(
        `insert into debts (customer_id, due_date)
         values ($1, $2)
         on conflict (customer_id) do update set due_date = excluded.due_date
         returning id`,
        [int(customerId), dueDate ? new Date(dueDate) : new Date(Date.now() + 14 * 86400000)]
      )
      await client.query(
        `insert into debt_entries (debt_id, type, date, amount, note)
         values ($1, 'belanja', now(), $2, $3)`,
        [debt.rows[0].id, int(amount), note || 'Utang dicatat manual']
      )
      await client.query('commit')
      res.status(201).json({ ok: true })
    } catch (err) {
      await client.query('rollback')
      throw err
    } finally {
      client.release()
    }
  })
)

app.post(
  '/api/debts/:customerId/payments',
  wrap(async (req, res) => {
    const customerId = int(req.params.customerId)
    const amount = int(req.body?.amount)
    const method = req.body?.method || 'Tunai'
    if (amount <= 0) return bad(res, 'Masukkan jumlah pembayaran.')

    const client = await pool.connect()
    try {
      await client.query('begin')
      const debt = await client.query('select * from debts where customer_id = $1 for update', [customerId])
      if (debt.rowCount === 0) {
        await client.query('rollback')
        return bad(res, 'Data utang tidak ditemukan.', 404)
      }
      const sums = await client.query(
        `select
           coalesce(sum(case when type = 'belanja' then amount end), 0)::int as total,
           coalesce(sum(case when type = 'bayar' then amount end), 0)::int as paid
         from debt_entries where debt_id = $1`,
        [debt.rows[0].id]
      )
      const { total, paid } = sums.rows[0]
      const remaining = Math.max(0, total - paid)
      if (amount > remaining) {
        await client.query('rollback')
        return bad(res, `Jumlah melebihi sisa utang (${remaining}).`, 409)
      }

      await client.query(
        `insert into debt_entries (debt_id, type, date, amount, method)
         values ($1, 'bayar', now(), $2, $3)`,
        [debt.rows[0].id, amount, method]
      )
      await client.query('commit')
      res.status(201).json({ ok: true, remaining: remaining - amount })
    } catch (err) {
      await client.query('rollback')
      throw err
    } finally {
      client.release()
    }
  })
)

/* -------------------------------- settings -------------------------------- */
app.patch(
  '/api/settings',
  wrap(async (req, res) => {
    const { storeName } = req.body || {}
    if (typeof storeName !== 'string' || storeName.trim().length < 2) {
      return bad(res, 'Nama toko minimal 2 karakter.')
    }
    const updated = await pool.query(
      'update settings set store_name = $1, updated_at = now() where id = 1 returning store_name',
      [storeName.trim()]
    )
    res.json({ settings: { storeName: updated.rows[0].store_name } })
  })
)

/* Endpoint API tidak dikenal → jawab JSON, bukan HTML bawaan Express. */
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }))

/* -------------------------------- error -------------------------------- */
app.use((err, _req, res, _next) => {
  console.error('[api]', err)
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' })
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[api] Kasir API siap di http://127.0.0.1:${PORT}`)
})
