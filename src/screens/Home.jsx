import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { Page, Icon, Btn, EmptyState, Modal, rupiah } from '../ui.jsx'
import { isSameDay, relativeDue, daysFromToday } from '../lib/format'

export default function Home({ nav, tab }) {
  const { products, sales, debtList, getProduct, storeName } = useStore()
  const [notifOpen, setNotifOpen] = useState(false)

  const today = new Date()
  const todaySales = sales.filter((s) => isSameDay(s.date, today))
  const omzet = todaySales.reduce((s, x) => s + x.total, 0)
  const gross = todaySales.reduce(
    (s, x) =>
      s +
      x.items.reduce((t, it) => {
        const p = getProduct(it.id)
        return t + (p ? (p.price - p.cost) * it.qty : 0)
      }, 0),
    0
  )

  const lowStock = products.filter((p) => p.stock <= p.minStock)
  const overdue = debtList.filter((d) => daysFromToday(d.dueDate) < 0)
  const overdueTotal = overdue.reduce((s, d) => s + d.remaining, 0)
  const alertCount = lowStock.length + overdue.length

  const best = useMemo(() => {
    const map = new Map()
    todaySales.forEach((s) => s.items.forEach((it) => map.set(it.id, (map.get(it.id) || 0) + it.qty)))
    return [...map.entries()]
      .map(([id, qty]) => ({ product: getProduct(id), qty }))
      .filter((x) => x.product)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3)
  }, [todaySales, getProduct])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 11) return 'Selamat pagi,'
    if (h < 15) return 'Selamat siang,'
    if (h < 18) return 'Selamat sore,'
    return 'Selamat malam,'
  })()

  return (
    <Page>
      <div className="between" style={{ marginBottom: 18 }}>
        <div className="grow">
          <p className="eyebrow">{greeting}</p>
          <h1 className="page-title">{storeName}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="icon-btn"
            onClick={() => nav('pengaturan')}
            aria-label="Pengaturan"
          >
            <Icon name="gear" />
          </button>
          <button
            type="button"
            className="icon-btn"
            style={{ position: 'relative' }}
            onClick={() => setNotifOpen(true)}
            aria-label="Notifikasi"
          >
            <Icon name="bell" />
            {alertCount > 0 ? <span className="bell-dot" /> : null}
          </button>
        </div>
      </div>

      <div className="home-top">
        <div>
          <div className="hero">
        <div className="hero-label">Penjualan hari ini</div>
        <div className="hero-amount num" style={{ marginTop: 4 }}>
          {rupiah(omzet)}
        </div>
        <div className="hero-sub">
          <div>
            <span>Transaksi</span>
            <strong>{todaySales.length}</strong>
          </div>
          <div>
            <span>Untung kotor</span>
            <strong className="num">{rupiah(gross)}</strong>
          </div>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 16 }}>
        <Btn variant="dark" onClick={() => nav('kasir')}>
          <Icon name="plus" size={20} strokeWidth={2.6} />
          Transaksi baru
        </Btn>
        <Btn variant="ghost" onClick={() => nav('barang-masuk')}>
          <Icon name="box" size={20} />
          Barang masuk
        </Btn>
      </div>
        </div>

        <div>
          <h2 className="section-title home-side-title">
            Perlu perhatian
          </h2>

      {alertCount === 0 ? (
        <div className="card card-soft">
          <div className="row" style={{ gap: 12 }}>
            <div className="icon-badge" style={{ background: '#fff', color: 'var(--primary)' }}>
              <Icon name="check" size={24} strokeWidth={2.4} />
            </div>
            <div className="grow">
              <div className="strong">Semua aman</div>
              <div className="small muted">Tidak ada stok menipis atau utang jatuh tempo.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {lowStock.length > 0 ? (
            <button type="button" className="card card-btn" onClick={() => nav('stok')}>
              <div className="row" style={{ gap: 12 }}>
                <div className="icon-badge warn">
                  <Icon name="warn" size={24} />
                </div>
                <div className="grow">
                  <div className="strong">{lowStock.length} produk stok menipis</div>
                  <div className="small muted truncate">
                    {lowStock.slice(0, 2).map((p) => p.name).join(', ')}
                    {lowStock.length > 2 ? `, dan ${lowStock.length - 2} lainnya` : ''}
                  </div>
                </div>
                <Icon name="right" size={20} className="muted" />
              </div>
            </button>
          ) : null}

          {overdue.length > 0 ? (
            <button type="button" className="card card-btn" onClick={() => tab('utang')}>
              <div className="row" style={{ gap: 12 }}>
                <div className="icon-badge danger">
                  <Icon name="clock" size={24} />
                </div>
                <div className="grow">
                  <div className="strong">{overdue.length} utang jatuh tempo</div>
                  <div className="small muted">{rupiah(overdueTotal)} belum dibayar</div>
                </div>
                <Icon name="right" size={20} className="muted" />
              </div>
            </button>
          ) : null}
        </div>
      )}
        </div>
      </div>

      <h2 className="section-title" style={{ margin: '28px 0 4px' }}>
        Terlaris hari ini
      </h2>

      {best.length === 0 ? (
        <div className="card" style={{ marginTop: 12 }}>
          <EmptyState
            inline
            icon="chart"
            title="Belum ada penjualan hari ini"
            text="Mulai transaksi pertama, ringkasannya akan muncul di sini."
            action={<Btn size="sm" variant="ghost" onClick={() => nav('kasir')}>Buka kasir</Btn>}
          />
        </div>
      ) : (
        <div>
          {best.map((row) => (
            <div key={row.product.id} className="between" style={{ padding: '15px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600 }}>{row.product.name}</span>
              <span className="muted num">{row.qty} terjual</span>
            </div>
          ))}
        </div>
      )}

      {notifOpen ? (
        <Modal onClose={() => setNotifOpen(false)}>
          <h3>Notifikasi</h3>
          <p className="modal-sub">Pengingat otomatis dari stok dan utang.</p>
          <div className="stack" style={{ gap: 10 }}>
            {lowStock.length > 0 ? (
              <button
                type="button"
                className="card card-btn card-tight"
                onClick={() => {
                  setNotifOpen(false)
                  nav('stok')
                }}
              >
                <div className="row" style={{ gap: 12 }}>
                  <div className="icon-badge warn" style={{ width: 44, height: 44, borderRadius: 13 }}>
                    <Icon name="warn" size={21} />
                  </div>
                  <div className="grow">
                    <div className="strong small">{lowStock.length} produk stok menipis</div>
                    <div className="small muted truncate">{lowStock.map((p) => p.name).join(', ')}</div>
                  </div>
                  <Icon name="right" size={18} className="muted" />
                </div>
              </button>
            ) : null}

            {overdue.length > 0 ? (
              <button
                type="button"
                className="card card-btn card-tight"
                onClick={() => {
                  setNotifOpen(false)
                  tab('utang')
                }}
              >
                <div className="row" style={{ gap: 12 }}>
                  <div className="icon-badge danger" style={{ width: 44, height: 44, borderRadius: 13 }}>
                    <Icon name="clock" size={21} />
                  </div>
                  <div className="grow">
                    <div className="strong small">{overdue.length} utang jatuh tempo</div>
                    <div className="small muted">
                      {overdue.map((d) => `${d.customer.name} · ${relativeDue(d.dueDate)}`).join(' · ')}
                    </div>
                  </div>
                  <Icon name="right" size={18} className="muted" />
                </div>
              </button>
            ) : null}
          </div>
          <div style={{ marginTop: 16 }}>
            <Btn variant="ghost" block onClick={() => setNotifOpen(false)}>
              Tutup
            </Btn>
          </div>
        </Modal>
      ) : null}
    </Page>
  )
}
