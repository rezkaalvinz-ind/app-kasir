import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { Icon, Btn, EmptyState, Stepper, PushHeader, rupiah } from '../ui.jsx'

export default function Kasir({ nav, home }) {
  const { products, cartLines, cartCount, cartTotal, addToCart, setQty, clearCart } = useStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Semua')

  const categories = useMemo(() => ['Semua', ...new Set(products.map((p) => p.category))], [products])
  const query = q.trim().toLowerCase()
  const filtered = products.filter(
    (p) => (cat === 'Semua' || p.category === cat) && p.name.toLowerCase().includes(query)
  )

  const qtyOf = (id) => cartLines.find((l) => l.id === id)?.qty || 0

  return (
    <div className="kasir">
      <div className="kasir-body">
        <PushHeader title="Kasir" onBack={home} />

        <div className="search" style={{ marginTop: 12 }}>
          <Icon name="search" size={21} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari atau scan barcode"
            aria-label="Cari produk"
          />
          {q ? (
            <button type="button" className="btn-link" onClick={() => setQ('')} aria-label="Hapus pencarian">
              <Icon name="close" size={18} />
            </button>
          ) : null}
        </div>

        <div className="chiprow" style={{ marginTop: 14 }}>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={'chip' + (cat === c ? ' on' : '')}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title={query ? 'Produk tidak ditemukan' : 'Belum ada produk'}
            text={
              query
                ? `Tidak ada produk yang cocok dengan “${q}”. Coba kata kunci lain.`
                : 'Tambahkan produk dulu supaya bisa berjualan.'
            }
            action={
              query ? (
                <Btn size="sm" variant="ghost" onClick={() => setQ('')}>
                  Hapus pencarian
                </Btn>
              ) : (
                <Btn size="sm" variant="ghost" onClick={() => nav('produk-baru')}>
                  Tambah produk
                </Btn>
              )
            }
          />
        ) : (
          <div className="grid2" style={{ marginTop: 14 }}>
            {filtered.map((p) => {
              const inCart = qtyOf(p.id)
              const habis = p.stock <= 0
              const penuh = inCart >= p.stock
              const low = p.stock <= p.minStock
              return (
                <button
                  key={p.id}
                  type="button"
                  className={'pcard' + (habis ? ' out' : '')}
                  disabled={habis || penuh}
                  onClick={() => addToCart(p.id)}
                  title={penuh ? 'Stok di keranjang sudah maksimal' : undefined}
                >
                  {inCart > 0 ? <span className="qty-badge">{inCart}</span> : null}
                  <span className="pcard-name">{p.name}</span>
                  <span className={'pcard-stock' + (low ? ' low' : '')}>
                    {habis ? 'Stok habis' : `Stok ${p.stock}`}
                  </span>
                  <span className="pcard-price num">{rupiah(p.price)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="kasir-cart">
        <div className="sheet">
          {cartCount === 0 ? (
            <EmptyState
              inline
              icon="cart"
              title="Keranjang masih kosong"
              text="Tap produk di atas untuk mulai transaksi."
            />
          ) : (
            <>
              <div className="sheet-head">
                <span className="muted" style={{ fontWeight: 600, fontSize: 15 }}>
                  {cartCount} item di keranjang
                </span>
                <button type="button" className="btn-link" style={{ color: 'var(--danger)' }} onClick={clearCart}>
                  Kosongkan
                </button>
              </div>

              <div className="sheet-items">
                {cartLines.map((line) => (
                  <div className="cart-line" key={line.id}>
                    <div className="grow">
                      <div className="cart-name truncate">{line.product.name}</div>
                      <div className="cart-sub num">
                        {rupiah(line.product.price)} × {line.qty} · stok {line.product.stock}
                      </div>
                    </div>
                    <Stepper
                      qty={line.qty}
                      max={line.product.stock}
                      onDec={() => setQty(line.id, line.qty - 1)}
                      onInc={() => addToCart(line.id, 1)}
                    />
                    <span className="amount" style={{ minWidth: 72, textAlign: 'right', fontSize: 15 }}>
                      {rupiah(line.product.price * line.qty)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="divider-dashed" style={{ margin: '6px 0' }} />

              <div className="cart-total">
                <span className="label">Total</span>
                <span className="value num">{rupiah(cartTotal)}</span>
              </div>

              <div className="btn-row" style={{ marginTop: 8 }}>
                <Btn variant="ghost" size="sm" onClick={() => nav('pilih-pelanggan')}>
                  Utang
                </Btn>
                <Btn variant="ghost" size="sm" onClick={() => nav('qris')}>
                  QRIS
                </Btn>
                <Btn variant="primary" size="sm" onClick={() => nav('bayar-tunai')}>
                  Tunai
                </Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
