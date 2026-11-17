import { useEffect, useState } from 'react'
import { useStore } from '../store.jsx'
import {
  Page,
  PushHeader,
  Icon,
  Btn,
  Field,
  MoneyInput,
  Modal,
  EmptyState,
  KV,
  rupiah,
} from '../ui.jsx'
import { fmtDate, fmtDateTime, relativeDue } from '../lib/format'

function CartEmpty({ onBack }) {
  return (
    <Page footer={<Btn block onClick={onBack}>Kembali ke kasir</Btn>}>
      <PushHeader title="Pembayaran" onBack={onBack} />
      <EmptyState
        icon="cart"
        title="Keranjang masih kosong"
        text="Tambahkan produk dulu sebelum memilih metode pembayaran."
        action={<Btn variant="ghost" size="sm" onClick={onBack}>Pilih produk</Btn>}
      />
    </Page>
  )
}

/* ---------------------------- Bayar tunai ---------------------------- */
export function BayarTunai({ back, replace }) {
  const { cartTotal, cartCount, checkout, pending, toast } = useStore()
  const [cash, setCash] = useState(0)
  const [touched, setTouched] = useState(false)

  if (cartCount === 0) return <CartEmpty onBack={back} />

  const kurang = cash < cartTotal
  const change = Math.max(0, cash - cartTotal)
  const chips = [...new Set([cartTotal, 20000, 50000, 100000])]
    .filter((v) => v >= cartTotal)
    .sort((a, b) => a - b)

  const submit = async () => {
    setTouched(true)
    if (kurang || pending) return
    try {
      const sale = await checkout({ method: 'tunai', cash, change })
      replace('transaksi-selesai', { saleId: sale.id })
    } catch (err) {
      toast(err.message)
    }
  }

  return (
    <Page
      bodyClass="narrow"
      footer={
        <Btn block onClick={submit} disabled={kurang || pending}>
          Selesaikan pembayaran
        </Btn>
      }
    >
      <PushHeader title="Bayar tunai" onBack={back} />

      <div className="card" style={{ marginTop: 12 }}>
        <div className="muted small" style={{ fontWeight: 600 }}>Total belanja</div>
        <div className="big-amount num" style={{ marginTop: 2 }}>{rupiah(cartTotal)}</div>
      </div>

      <div style={{ marginTop: 20 }}>
        <Field
          label="Uang diterima"
          htmlFor="uang-diterima"
          error={touched && kurang ? `Uang kurang ${rupiah(cartTotal - cash)} dari total belanja.` : null}
          hint={!cash ? 'Nominal otomatis berformat ribuan saat diketik.' : null}
        >
          <MoneyInput id="uang-diterima" value={cash} onChange={setCash} invalid={touched && kurang} autoFocus />
        </Field>
      </div>

      <div className="chip-row-actions" style={{ marginTop: 12 }}>
        {chips.map((v) => (
          <button key={v} type="button" className="chip chip-sm" onClick={() => setCash(v)}>
            {v === cartTotal ? 'Uang pas' : rupiah(v)}
          </button>
        ))}
      </div>

      {cash > 0 && !kurang ? (
        <div className="card card-soft" style={{ marginTop: 20 }}>
          <div className="between">
            <span style={{ fontWeight: 800, color: 'var(--primary)' }}>Kembalian</span>
            <span className="num" style={{ fontWeight: 800, fontSize: 26, color: 'var(--primary)' }}>
              {rupiah(change)}
            </span>
          </div>
        </div>
      ) : null}

      {kurang && cash > 0 ? (
        <div className="card card-danger-bg" style={{ marginTop: 20 }}>
          <div className="between">
            <span style={{ fontWeight: 800, color: 'var(--danger)' }}>Uang kurang</span>
            <span className="num" style={{ fontWeight: 800, fontSize: 22, color: 'var(--danger)' }}>
              {rupiah(cartTotal - cash)}
            </span>
          </div>
        </div>
      ) : null}
    </Page>
  )
}

/* ------------------------------- QRIS ------------------------------- */
function qrOn(x, y, n) {
  const inFinder = (ox, oy) => {
    if (!(x >= ox && x < ox + 7 && y >= oy && y < oy + 7)) return null
    const dx = x - ox
    const dy = y - oy
    const ring = dx === 0 || dx === 6 || dy === 0 || dy === 6
    const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4
    return ring || core
  }
  for (const [ox, oy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
    const r = inFinder(ox, oy)
    if (r !== null) return r
  }
  if (x === 6 || y === 6) return (x + y) % 2 === 0
  return (x * 5 + y * 3 + x * y) % 7 < 3
}

function QrArt() {
  const n = 23
  const cells = []
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qrOn(x, y, n)) {
        cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" rx="0.16" />)
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${n} ${n}`} fill="#1b1f1d" shapeRendering="crispEdges" role="img" aria-label="Kode QRIS">
      {cells}
    </svg>
  )
}

export function Qris({ back, replace }) {
  const { cartTotal, cartCount, checkout, toast, pending } = useStore()
  const [mode, setMode] = useState('qris')
  const [left, setLeft] = useState(300)

  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  if (cartCount === 0) return <CartEmpty onBack={back} />

  const expired = left <= 0
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  const copyRek = async () => {
    try {
      await navigator.clipboard.writeText('1234567890')
      toast('Nomor rekening disalin')
    } catch {
      toast('Nomor rekening BCA: 1234567890')
    }
  }

  const confirm = async () => {
    if (expired || pending) return
    try {
      const sale = await checkout({ method: 'qris' })
      replace('transaksi-selesai', { saleId: sale.id })
    } catch (err) {
      toast(err.message)
    }
  }

  return (
    <Page
      bodyClass="narrow"
      footer={
        <>
          <Btn block onClick={confirm} disabled={expired || pending}>
            Sudah dibayar (cek manual)
          </Btn>
          <Btn block variant="ghost" onClick={back}>Batal</Btn>
        </>
      }
    >
      <PushHeader title="QRIS / transfer" onBack={back} />

      <div className="card between" style={{ marginTop: 12 }}>
        <span className="muted">Total</span>
        <span className="num" style={{ fontWeight: 800, fontSize: 22 }}>{rupiah(cartTotal)}</span>
      </div>

      <div className="btn-row" style={{ marginTop: 14 }}>
        <Btn variant={mode === 'qris' ? 'primary' : 'ghost'} size="sm" onClick={() => setMode('qris')}>
          QRIS
        </Btn>
        <Btn variant={mode === 'bank' ? 'primary' : 'ghost'} size="sm" onClick={() => setMode('bank')}>
          Transfer bank
        </Btn>
      </div>

      {mode === 'qris' ? (
        <>
          <div style={{ marginTop: 20 }}>
            <div className="qrbox">
              <QrArt />
            </div>
          </div>
          <p className="note" style={{ textAlign: 'center', marginTop: 14 }}>
            Minta pelanggan scan QRIS, lalu tunggu status berubah menjadi <strong style={{ color: 'var(--primary)' }}>Lunas</strong>.
          </p>
        </>
      ) : (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="row between">
            <div>
              <div className="small muted">Bank BCA</div>
              <div className="mono" style={{ fontSize: 20, marginTop: 2 }}>1234567890</div>
              <div className="small muted" style={{ marginTop: 2 }}>a.n. Sari Wulandari</div>
            </div>
            <Btn variant="ghost" size="sm" onClick={copyRek}>
              <Icon name="copy" size={17} />
              Salin
            </Btn>
          </div>
        </div>
      )}

      <div className={'status-wait' + (expired ? ' status-err' : '')} style={{ marginTop: 18 }}>
        <span className="dot" />
        {expired ? (
          <span>Waktu habis — buat QR baru</span>
        ) : (
          <span className="between grow" style={{ gap: 8 }}>
            <span>Menunggu pembayaran…</span>
            <span className="num">{mm}:{ss}</span>
          </span>
        )}
      </div>

      {expired ? (
        <div style={{ marginTop: 10 }}>
          <Btn block variant="ghost" onClick={() => setLeft(300)}>
            Buat QR baru
          </Btn>
        </div>
      ) : null}
    </Page>
  )
}

/* -------------------------- Pilih pelanggan -------------------------- */
export function PilihPelanggan({ back, replace }) {
  const { cartTotal, cartCount, customers, debtOf, addCustomer, checkout, toast, pending } = useStore()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})

  if (cartCount === 0) return <CartEmpty onBack={back} />

  const query = q.trim().toLowerCase()
  const list = customers.filter(
    (c) => c.name.toLowerCase().includes(query) || (c.phone || '').replace(/\D/g, '').includes(query.replace(/\D/g, ''))
  )

  const saveCustomer = async () => {
    const e = {}
    if (name.trim().length < 2) e.name = 'Nama pelanggan minimal 2 karakter.'
    if (phone.replace(/\D/g, '').length < 8) e.phone = 'Nomor HP minimal 8 digit.'
    setErrors(e)
    if (Object.keys(e).length) return
    try {
      const id = await addCustomer({ name: name.trim(), phone })
      setSelected(id)
      setAdding(false)
      setName('')
      setPhone('')
      setErrors({})
      toast('Pelanggan baru ditambahkan')
    } catch (err) {
      toast(err.message)
    }
  }

  const submit = async () => {
    if (!selected || pending) return
    try {
      const sale = await checkout({ method: 'utang', customerId: selected })
      replace('transaksi-selesai', { saleId: sale.id })
    } catch (err) {
      toast(err.message)
    }
  }

  return (
    <Page
      bodyClass="narrow"
      footer={
        <>
          <Btn block onClick={submit} disabled={!selected || pending}>
            Simpan sebagai utang
          </Btn>
          {!selected ? <div className="note" style={{ textAlign: 'center' }}>Pilih pelanggan dulu untuk melanjutkan.</div> : null}
        </>
      }
    >
      <PushHeader title="Catat sebagai utang" onBack={back} />

      <div className="card between" style={{ marginTop: 12 }}>
        <span className="muted">Nilai transaksi</span>
        <span className="num" style={{ fontWeight: 800, fontSize: 20 }}>{rupiah(cartTotal)}</span>
      </div>

      <div className="search" style={{ marginTop: 14 }}>
        <Icon name="search" size={21} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama atau nomor HP"
          aria-label="Cari pelanggan"
        />
      </div>

      <div className="stack" style={{ marginTop: 14, gap: 10 }}>
        {list.length === 0 ? (
          <div className="card">
            <EmptyState
              inline
              icon="user"
              title="Pelanggan tidak ditemukan"
              text="Tambahkan pelanggan baru untuk mencatat utang ini."
            />
          </div>
        ) : (
          list.map((c) => {
            const info = debtOf(c.id)
            const on = selected === c.id
            return (
              <button
                key={c.id}
                type="button"
                className="card card-btn"
                style={on ? { borderColor: 'var(--primary)', boxShadow: '0 0 0 2px rgba(11,107,82,.12)' } : undefined}
                onClick={() => setSelected(c.id)}
              >
                <div className="row" style={{ gap: 12 }}>
                  <div className={'avatar' + (on ? ' soft' : '')}>{initialsOf(c.name)}</div>
                  <div className="grow">
                    <div className="strong" style={{ fontSize: 16.5 }}>{c.name}</div>
                    <div className={'small ' + (info && info.remaining > 0 ? '' : 'muted')}>
                      {info && info.remaining > 0 ? (
                        <span style={{ color: 'var(--danger)' }}>
                          Utang lama {rupiah(info.remaining)} · {relativeDue(info.dueDate)}
                        </span>
                      ) : (
                        c.phone || 'Belum ada utang'
                      )}
                    </div>
                  </div>
                  {on ? (
                    <span style={{ color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
                      <Icon name="check" size={22} strokeWidth={2.6} />
                    </span>
                  ) : (
                    <span className="small" style={{ color: 'var(--primary)', fontWeight: 800 }}>Pilih</span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      {adding ? (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="strong" style={{ marginBottom: 12 }}>Pelanggan baru</div>
          <div className="stack" style={{ gap: 12 }}>
            <Field label="Nama pelanggan" htmlFor="cust-name" error={errors.name}>
              <input
                id="cust-name"
                className={'input' + (errors.name ? ' invalid' : '')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Bu Ani"
              />
            </Field>
            <Field label="Nomor HP" htmlFor="cust-phone" error={errors.phone} hint="Dipakai untuk mengirim tagihan WhatsApp.">
              <input
                id="cust-phone"
                className={'input num' + (errors.phone ? ' invalid' : '')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812xxxxxxx"
                inputMode="tel"
              />
            </Field>
            <div className="btn-row">
              <Btn variant="ghost" size="sm" onClick={() => setAdding(false)}>Batal</Btn>
              <Btn size="sm" onClick={saveCustomer}>Simpan pelanggan</Btn>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-ghost btn-block"
          style={{ marginTop: 14, borderStyle: 'dashed', color: 'var(--primary)' }}
          onClick={() => setAdding(true)}
        >
          <Icon name="plus" size={19} strokeWidth={2.4} />
          Pelanggan baru
        </button>
      )}
    </Page>
  )
}

function initialsOf(name = '') {
  return name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()
}

/* -------------------------- Transaksi selesai -------------------------- */
export function TransaksiSelesai({ params, tab, replace }) {
  const { sales, getProduct, customers, toast, storeName } = useStore()
  const [receiptOpen, setReceiptOpen] = useState(false)
  const sale = sales.find((s) => s.id === params.saleId)

  if (!sale) {
    return (
      <Page footer={<Btn block onClick={() => tab('home')}>Kembali ke beranda</Btn>}>
        <EmptyState
          icon="receipt"
          title="Transaksi tidak ditemukan"
          text="Data transaksi ini tidak tersedia. Mulai transaksi baru dari kasir."
        />
      </Page>
    )
  }

  const items = sale.items.map((it) => ({ ...it, product: getProduct(it.id) }))
  const lineName = (it) => it.name || it.product?.name || 'Produk'
  const linePrice = (it) => (typeof it.price === 'number' ? it.price : it.product?.price || 0)
  const buyer = sale.customerId ? customers.find((c) => c.id === sale.customerId) : null
  const methodRow =
    sale.method === 'tunai'
      ? `Tunai · kembali ${rupiah(sale.change)}`
      : sale.method === 'qris'
      ? 'QRIS'
      : `Utang${buyer ? ' · ' + buyer.name : ''}`

  const waText = [
    `Halo, terima kasih sudah berbelanja di ${storeName}.`,
    '',
    `${sale.code} · ${fmtDateTime(sale.date)}`,
    ...items.map((it) => `${lineName(it)} × ${it.qty} — ${rupiah(linePrice(it) * it.qty)}`),
    '',
    `Total: ${rupiah(sale.total)}`,
    `Metode: ${sale.method === 'tunai' ? 'Tunai' : sale.method === 'qris' ? 'QRIS' : 'Utang'}`,
  ].join('\n')

  const sendWa = async () => {
    try {
      await navigator.clipboard.writeText(waText)
      toast('Struk disalin — tempel di WhatsApp')
    } catch {
      toast('Struk siap, tapi penyalinan diblokir browser')
    }
  }

  return (
    <div className="page">
      <div className="success">
        <div className="success-icon">
          <Icon name="check" size={44} strokeWidth={2.8} />
        </div>
        <h2>Transaksi selesai</h2>
        <p className="success-sub">
          {sale.code} · {fmtDateTime(sale.date)}
        </p>

        <div className="card success-card">
          {items.map((it) => (
            <div className="kv" key={it.id}>
              <span className="k" style={{ color: 'var(--ink)', fontWeight: 600 }}>
                {lineName(it)} × {it.qty}
              </span>
              <span className="v">{rupiah(linePrice(it) * it.qty)}</span>
            </div>
          ))}
          <div className="divider-dashed" style={{ margin: '10px 0' }} />
          <KV label="Total" value={rupiah(sale.total)} big />
          <KV label="Metode" value={methodRow} />
        </div>

        <p className="note" style={{ marginTop: 16, textAlign: 'center' }}>
          Stok {items[0] ? lineName(items[0]) : 'produk'} otomatis berkurang {items[0]?.qty || 0} pcs.
        </p>
      </div>

      <div className="page-foot">
        <Btn block onClick={() => replace('kasir', {})}>Transaksi baru</Btn>
        <div className="btn-row" style={{ marginTop: 10 }}>
          <Btn variant="ghost" onClick={() => setReceiptOpen(true)}>
            <Icon name="print" size={19} />
            Cetak struk
          </Btn>
          <Btn variant="ghost" onClick={sendWa}>
            <Icon name="wa" size={19} />
            Kirim WA
          </Btn>
        </div>
        <button type="button" className="btn-text" style={{ width: '100%' }} onClick={() => tab('home')}>
          Kembali ke beranda
        </button>
      </div>

      {receiptOpen ? (
        <Modal onClose={() => setReceiptOpen(false)}>
          <h3>Pratinjau struk</h3>
          <p className="modal-sub">Periksa dulu sebelum dicetak.</p>
          <div className="receipt">
            <h4>{storeName}</h4>
            <div className="r-sub">Jl. Melati No. 12 · 0812-3456-7890</div>
            <div className="r-line">
              <span>{sale.code}</span>
              <span>{fmtDateTime(sale.date)}</span>
            </div>
            <div className="divider-dashed" style={{ margin: '8px 0' }} />
            {items.map((it) => (
              <div className="r-line" key={it.id}>
                <span>{lineName(it)} × {it.qty}</span>
                <span>{rupiah(linePrice(it) * it.qty)}</span>
              </div>
            ))}
            <div className="divider-dashed" style={{ margin: '8px 0' }} />
            <div className="r-line" style={{ fontWeight: 800, fontSize: 15 }}>
              <span>Total</span>
              <span>{rupiah(sale.total)}</span>
            </div>
            {sale.method === 'tunai' ? (
              <>
                <div className="r-line"><span>Tunai</span><span>{rupiah(sale.cash)}</span></div>
                <div className="r-line"><span>Kembali</span><span>{rupiah(sale.change)}</span></div>
              </>
            ) : null}
            <div className="r-foot">
              Terima kasih sudah berbelanja 🙏
              <br />
              Barang yang sudah dibeli tidak dapat ditukar.
            </div>
          </div>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setReceiptOpen(false)}>Tutup</Btn>
            <Btn onClick={() => window.print()}>
              <Icon name="print" size={18} />
              Cetak
            </Btn>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
