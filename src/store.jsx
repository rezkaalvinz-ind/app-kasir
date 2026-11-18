import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const Ctx = createContext(null)

const TOKEN_KEY = 'kasir_token'

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

let authToken = readToken()

async function api(path, options = {}) {
  let res
  try {
    res = await fetch(`/api${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      ...options,
    })
  } catch {
    throw new Error('Tidak bisa menghubungi server. Pastikan `npm start` berjalan.')
  }
  const data = await res.json().catch(() => ({}))
  const fallback =
    res.status >= 500
      ? 'Server API tidak merespons. Jalankan `npm start` (bukan hanya `npm run dev`) di folder proyek.'
      : `Permintaan gagal (${res.status}).`
  const err = new Error(data.error || fallback)
  err.status = res.status
  if (!res.ok) throw err
  return data
}

const EMPTY_DB = {
  products: [],
  customers: [],
  sales: [],
  stockIns: [],
  debts: [],
  settings: { storeName: 'Toko Saya' },
}

export function StoreProvider({ children }) {
  const [db, setDb] = useState(EMPTY_DB)
  const [status, setStatus] = useState(() => (readToken() ? 'loading' : 'anon')) // anon | loading | ready | error
  const [error, setError] = useState(null)
  const [me, setMe] = useState(null)
  const [pending, setPending] = useState(false)
  const [cart, setCart] = useState([])
  const [toastMsg, setToastMsg] = useState(null)
  const timer = useRef(null)

  const toast = useCallback((msg) => {
    setToastMsg(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToastMsg(null), 3200)
  }, [])

  const load = useCallback(async () => {
    if (!authToken) {
      setStatus('anon')
      return
    }
    try {
      const data = await api('/bootstrap')
      setDb({
        products: data.products || [],
        customers: data.customers || [],
        sales: data.sales || [],
        stockIns: data.stockIns || [],
        debts: data.debts || [],
        settings: data.settings || { storeName: 'Toko Saya' },
      })
      setMe(data.me || null)
      setError(null)
      setStatus('ready')
    } catch (err) {
      // Sesi kedaluwarsa / token tidak valid → kembali ke layar login.
      if (err.status === 401) {
        authToken = null
        writeToken(null)
        setMe(null)
        setDb(EMPTY_DB)
        setCart([])
        setStatus('anon')
        return
      }
      setError(err.message)
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'))
      toast(err.message)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const run = useCallback(async (task) => {
    setPending(true)
    try {
      return await task()
    } finally {
      setPending(false)
    }
  }, [])

  const { products, customers, sales, stockIns, debts, settings } = db
  const storeName = settings?.storeName || 'Toko Saya'

  const getProduct = useCallback(
    (id) => products.find((p) => p.id === Number(id)),
    [products]
  )

  const cartLines = useMemo(
    () =>
      cart
        .map((line) => ({ ...line, product: products.find((p) => p.id === line.id) }))
        .filter((line) => line.product),
    [cart, products]
  )
  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0)
  const cartTotal = cartLines.reduce((sum, line) => sum + line.product.price * line.qty, 0)

  // Kalau stok berubah di server, keranjang ikut menyesuaikan.
  useEffect(() => {
    setCart((prev) => {
      if (prev.length === 0) return prev
      const next = prev
        .map((line) => {
          const product = products.find((p) => p.id === line.id)
          if (!product || product.stock <= 0) return null
          return { id: line.id, qty: Math.min(line.qty, product.stock) }
        })
        .filter(Boolean)
      const same =
        next.length === prev.length && next.every((line, i) => line.qty === prev[i]?.qty && line.id === prev[i]?.id)
      return same ? prev : next
    })
  }, [products])

  const addToCart = useCallback(
    (id, delta = 1) => {
      setCart((prev) => {
        const product = products.find((p) => p.id === Number(id))
        if (!product || product.stock <= 0) return prev
        const line = prev.find((l) => l.id === product.id)
        const next = Math.min(product.stock, Math.max(0, (line?.qty || 0) + delta))
        if (line && next === line.qty) return prev
        if (next === 0) return prev.filter((l) => l.id !== product.id)
        return line
          ? prev.map((l) => (l.id === product.id ? { ...l, qty: next } : l))
          : [...prev, { id: product.id, qty: next }]
      })
    },
    [products]
  )

  const setQty = useCallback(
    (id, qty) => {
      setCart((prev) => {
        const product = products.find((p) => p.id === Number(id))
        const max = product?.stock ?? 0
        const next = Math.min(max, Math.max(0, qty))
        if (next === 0) return prev.filter((l) => l.id !== id)
        return prev.map((l) => (l.id === id ? { ...l, qty: next } : l))
      })
    },
    [products]
  )

  const clearCart = useCallback(() => setCart([]), [])

  const checkout = useCallback(
    (payload) =>
      run(async () => {
        const items = cart.map((line) => ({ productId: line.id, qty: line.qty }))
        const { sale } = await api('/checkout', {
          method: 'POST',
          body: JSON.stringify({ ...payload, items }),
        })
        setCart([])
        await load()
        return sale
      }),
    [cart, run, load]
  )

  const addProduct = useCallback(
    (data) =>
      run(async () => {
        const { product } = await api('/products', { method: 'POST', body: JSON.stringify(data) })
        await load()
        return product
      }),
    [run, load]
  )

  const updateProduct = useCallback(
    (id, data) =>
      run(async () => {
        const { product } = await api(`/products/${Number(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        })
        await load()
        return product
      }),
    [run, load]
  )

  const deleteProduct = useCallback(
    (id) =>
      run(async () => {
        await api(`/products/${Number(id)}`, { method: 'DELETE' })
        await load()
      }),
    [run, load]
  )

  const login = useCallback(
    (username, password) =>
      run(async () => {
        const { token, user } = await api('/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        })
        authToken = token
        writeToken(token)
        setMe(user)
        await load()
      }),
    [run, load]
  )

  const register = useCallback(
    (name, username, password) =>
      run(async () => {
        const { token, user } = await api('/register', {
          method: 'POST',
          body: JSON.stringify({ name, username, password }),
        })
        authToken = token
        writeToken(token)
        setMe(user)
        await load()
      }),
    [run, load]
  )

  const logout = useCallback(async () => {
    try {
      await api('/logout', { method: 'POST' })
    } catch {}
    authToken = null
    writeToken(null)
    setMe(null)
    setDb(EMPTY_DB)
    setCart([])
    setStatus('anon')
  }, [])

  const saveSettings = useCallback(
    (data) =>
      run(async () => {
        const { settings } = await api('/settings', { method: 'PATCH', body: JSON.stringify(data) })
        setDb((prev) => ({ ...prev, settings }))
        return settings
      }),
    [run]
  )

  const addStock = useCallback(
    (payload) =>
      run(async () => {
        await api('/stock-ins', { method: 'POST', body: JSON.stringify(payload) })
        await load()
      }),
    [run, load]
  )

  const addCustomer = useCallback(
    ({ name, phone }) =>
      run(async () => {
        const { customer } = await api('/customers', {
          method: 'POST',
          body: JSON.stringify({ name, phone }),
        })
        await load()
        return customer.id
      }),
    [run, load]
  )

  const addDebt = useCallback(
    ({ customerId, amount, dueDate, note }) =>
      run(async () => {
        await api('/debts', {
          method: 'POST',
          body: JSON.stringify({ customerId, amount, dueDate, note }),
        })
        await load()
      }),
    [run, load]
  )

  const payDebt = useCallback(
    (customerId, amount, method) =>
      run(async () => {
        await api(`/debts/${Number(customerId)}/payments`, {
          method: 'POST',
          body: JSON.stringify({ amount, method }),
        })
        await load()
      }),
    [run, load]
  )

  const debtOf = useCallback(
    (customerId) => {
      const id = Number(customerId)
      const debt = debts.find((d) => d.customerId === id)
      if (!debt) return null
      const charges = debt.entries.filter((e) => e.type === 'belanja')
      const payments = debt.entries.filter((e) => e.type === 'bayar')
      const total = charges.reduce((sum, e) => sum + e.amount, 0)
      const paid = payments.reduce((sum, e) => sum + e.amount, 0)
      return {
        debt,
        customer: customers.find((c) => c.id === id),
        total,
        paid,
        remaining: Math.max(0, total - paid),
        dueDate: debt.dueDate,
        entries: debt.entries,
        payments: payments.length,
        charges: charges.length,
      }
    },
    [debts, customers]
  )

  const debtList = useMemo(() => {
    return debts
      .map((d) => {
        const charges = d.entries.filter((e) => e.type === 'belanja')
        const payments = d.entries.filter((e) => e.type === 'bayar')
        const total = charges.reduce((sum, e) => sum + e.amount, 0)
        const paid = payments.reduce((sum, e) => sum + e.amount, 0)
        return {
          id: d.id,
          customer: customers.find((c) => c.id === d.customerId) || { id: d.customerId, name: 'Pelanggan', phone: null },
          total,
          paid,
          remaining: Math.max(0, total - paid),
          dueDate: d.dueDate,
          payments: payments.length,
          charges: charges.length,
        }
      })
      .filter((d) => d.remaining > 0)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  }, [debts, customers])

  const value = {
    status,
    error,
    pending,
    refresh: load,
    products,
    customers,
    sales,
    stockIns,
    debts,
    cart,
    cartLines,
    cartCount,
    cartTotal,
    toastMsg,
    toast,
    getProduct,
    addToCart,
    setQty,
    clearCart,
    checkout,
    addProduct,
    updateProduct,
    deleteProduct,
    addStock,
    addCustomer,
    addDebt,
    payDebt,
    debtOf,
    debtList,
    me,
    settings,
    storeName,
    login,
    register,
    logout,
    saveSettings,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore harus dipakai di dalam StoreProvider')
  return ctx
}
