import { useEffect, useState } from 'react'
import { useStore } from '../store.jsx'
import {
  Page,
  PushHeader,
  Icon,
  Btn,
  Field,
  MoneyInput,
  DateField,
  EmptyState,
  Modal,
  KV,
  rupiah,
} from '../ui.jsx'
import { daysFromToday, fmtDate, relativeDue } from '../lib/format'

const initials = (name = '') =>
  name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()

/* ----------------------------- Utang pelanggan ----------------------------- */
export default function Utang({ nav }) {
  const { debtList, customers, addDebt, toast, pending } = useStore()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ customerId: customers[0]?.id || '', amount: 0, note: '' })
  const [due, setDue] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d
  })
  const [errors, setErrors] = useState({})

  const totalOutstanding = debtList.reduce((s, d) => s + d.remaining, 0)
  const overdue = debtList.filter((d) => daysFromToday(d.dueDate) < 0)
  const query = q.trim().toLowerCase()
  const list = debtList.filter((d) => d.customer.name.toLowerCase().includes(query))

  const save = async () => {
    const e = {}
    if (!form.customerId) e.customerId = 'Pilih pelanggan dulu.'
    if (form.amount <= 0) e.amount = 'Jumlah utang wajib diisi.'
    setErrors(e)
    if (Object.keys(e).length || pending) return
    try {
      await addDebt({
        customerId: form.customerId,
        amount: form.amount,
        dueDate: due,
        note: form.note.trim(),
      })
      setOpen(false)
      setForm({ customerId: customers[0]?.id || '', amount: 0, note: '' })
      toast('Utang berhasil dicatat')
    } catch (err) {
      toast(err.message)
    }
  }

  return (
    <Page>
      <div className="between" style={{ marginBottom: 16 }}>
        <h1 className="page-title">Utang pelanggan</h1>
        <Btn size="sm" onClick={() => setOpen(true)}>
          <Icon name="plus" size={18} strokeWidth={2.4} />
          Catat utang
        </Btn>
      </div>

      <div className="grid2">
        <div className="card" style={{ padding: 16 }}>
          <div className="small muted" style={{ fontWeight: 600 }}>Total belum dibayar</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 800, color: 'var(--danger)', marginTop: 4 }}>
            {rupiah(totalOutstanding)}
          </div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="small muted" style={{ fontWeight: 600 }}>Jatuh tempo</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{overdue.length} orang</div>
          {overdue.length > 0 ? (
            <div className="small" style={{ color: 'var(--danger)', marginTop: 2 }}>
              {rupiah(overdue.reduce((s, d) => s + d.remaining, 0))}
            </div>
          ) : (
            <div className="small muted" style={{ marginTop: 2 }}>Tidak ada yang telat</div>
          )}
        </div>
      </div>

      <div className="search" style={{ marginTop: 16 }}>
        <Icon name="search" size={21} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama pelanggan"
          aria-label="Cari pelanggan"
        />
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ marginTop: 16 }}>
          <EmptyState
            icon="wallet"
            title={query ? 'Pelanggan tidak ditemukan' : 'Belum ada utang tercatat'}
            text={
              query
                ? `Tidak ada nama yang cocok dengan “${q}”.`
                : 'Utang dari transaksi kasir akan otomatis muncul di sini.'
            }
            action={
              query ? (
                <Btn size="sm" variant="ghost" onClick={() => setQ('')}>Hapus pencarian</Btn>
              ) : (
                <Btn size="sm" variant="ghost" onClick={() => nav('kasir')}>Buka kasir</Btn>
              )
            }
          />
        </div>
      ) : (
        <div className="debt-list" style={{ marginTop: 16 }}>
          {list.map((d) => {
            const late = daysFromToday(d.dueDate) < 0
            const meta = late
              ? `Jatuh tempo ${fmtDate(d.dueDate)} · ${relativeDue(d.dueDate)}`
              : d.payments > 0
              ? `${d.payments}× cicilan · jatuh tempo ${fmtDate(d.dueDate)}`
              : `${d.charges} transaksi · jatuh tempo ${fmtDate(d.dueDate)}`

            return (
              <div
                key={d.id}
                role="button"
                tabIndex={0}
                className={'card card-btn' + (late ? ' card-alert' : '')}
                onClick={() => nav('detail-utang', { customerId: d.customer.id })}
                onKeyDown={(e) => e.key === 'Enter' && nav('detail-utang', { customerId: d.customer.id })}
              >
                <div className="row" style={{ gap: 12 }}>
                  <div className={'avatar' + (late ? ' alert' : '')}>{initials(d.customer.name)}</div>
                  <div className="grow">
                    <div className="strong" style={{ fontSize: 16.5 }}>{d.customer.name}</div>
                    <div className="small" style={{ color: late ? 'var(--danger)' : 'var(--muted)' }}>{meta}</div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}>
                    <div className="amount" style={{ fontSize: 16.5 }}>{rupiah(d.remaining)}</div>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={(e) => {
                        e.stopPropagation()
                        nav(late ? 'tagih-wa' : 'catat-pembayaran', { customerId: d.customer.id })
                      }}
                    >
                      {late ? 'Tagih WA' : 'Bayar'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {open ? (
        <Modal onClose={() => setOpen(false)}>
          <h3>Catat utang</h3>
          <p className="modal-sub">Untuk utang yang tidak lewat transaksi kasir.</p>

          {customers.length === 0 ? (
            <EmptyState
              inline
              icon="user"
              title="Belum ada pelanggan"
              text="Tambahkan pelanggan lewat alur kasir → Utang."
            />
          ) : (
            <div className="stack" style={{ gap: 16 }}>
              <Field label="Pelanggan" htmlFor="u-cust" error={errors.customerId}>
                <select
                  id="u-cust"
                  className="input"
                  value={form.customerId}
                  onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Jumlah utang" htmlFor="u-amount" error={errors.amount}>
                <MoneyInput
                  id="u-amount"
                  value={form.amount}
                  onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
                  invalid={!!errors.amount}
                />
              </Field>

              <Field label="Jatuh tempo" htmlFor="u-due">
                <DateField id="u-due" value={due} onChange={setDue} />
              </Field>

              <Field label="Catatan (opsional)" htmlFor="u-note">
                <input
                  id="u-note"
                  className="input"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Contoh: rokok 2 bungkus"
                />
              </Field>

              <div className="btn-row">
                <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
                <Btn onClick={save} disabled={pending}>Simpan utang</Btn>
              </div>
            </div>
          )}
        </Modal>
      ) : null}
    </Page>
  )
}

/* ------------------------------- Detail utang ------------------------------- */
export function DetailUtang({ params, nav, back, tab }) {
  const { debtOf } = useStore()
  const info = debtOf(params.customerId)

  if (!info) {
    return (
      <Page footer={<Btn block onClick={() => tab('utang')}>Kembali ke daftar utang</Btn>}>
        <PushHeader title="Detail utang" onBack={back} />
        <EmptyState icon="wallet" title="Data utang tidak ditemukan" text="Pelanggan ini sudah tidak punya catatan utang." />
      </Page>
    )
  }

  const late = daysFromToday(info.dueDate) < 0
  const lunas = info.remaining <= 0

  return (
    <Page
      bodyClass="narrow"
      footer={
        <div className="btn-row">
          <Btn variant="ghost" onClick={() => nav('tagih-wa', { customerId: info.customer.id })}>
            <Icon name="wa" size={19} />
            Tagih WA
          </Btn>
          <Btn
            disabled={lunas}
            onClick={() => nav('catat-pembayaran', { customerId: info.customer.id })}
          >
            Catat pembayaran
          </Btn>
        </div>
      }
    >
      <PushHeader title={info.customer.name} onBack={back} />

      <div
        className={'card' + (lunas ? ' card-soft' : ' card-danger-bg')}
        style={{ marginTop: 12 }}
      >
        <div
          className="small"
          style={{ fontWeight: 700, color: lunas ? 'var(--primary)' : 'var(--danger)' }}
        >
          {lunas ? 'Status' : 'Sisa utang'}
        </div>
        <div
          className="num"
          style={{
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: lunas ? 'var(--primary)' : 'var(--danger)',
            marginTop: 2,
          }}
        >
          {lunas ? 'Lunas' : rupiah(info.remaining)}
        </div>
        <div className="small" style={{ color: lunas ? 'var(--primary)' : 'var(--danger)', marginTop: 4 }}>
          {lunas ? 'Tidak ada sisa tagihan' : `Jatuh tempo ${fmtDate(info.dueDate)} · ${relativeDue(info.dueDate)}`}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <KV label="No. HP" value={info.customer.phone || '-'} />
        <KV label="Total utang dicatat" value={rupiah(info.total)} />
        <KV label="Sudah dibayar" value={rupiah(info.paid)} tone="ok" />
      </div>

      <h2 className="section-title" style={{ margin: '24px 0 12px' }}>Riwayat</h2>

      <div className="stack" style={{ gap: 10 }}>
        {info.entries.map((e) => (
          <div className="card card-tight" key={e.id}>
            <div className="between">
              <div className="grow">
                <div className="strong" style={{ fontSize: 15.5 }}>
                  {e.type === 'belanja' ? 'Belanja' : 'Bayar cicilan'} · {fmtDate(e.date)}
                </div>
                <div className="small muted">{e.type === 'belanja' ? e.note : e.method}</div>
              </div>
              <span
                className="amount"
                style={{ color: e.type === 'bayar' ? 'var(--primary)' : 'var(--ink)' }}
              >
                {e.type === 'bayar' ? '−' : ''}
                {rupiah(e.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Page>
  )
}

/* ----------------------------- Catat pembayaran ----------------------------- */
export function CatatPembayaran({ params, back, replace }) {
  const { debtOf, payDebt, toast, pending } = useStore()
  const info = debtOf(params.customerId)
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState('Tunai')
  const [touched, setTouched] = useState(false)

  if (!info) {
    return (
      <Page footer={<Btn block onClick={back}>Kembali</Btn>}>
        <PushHeader title="Catat pembayaran" onBack={back} />
        <EmptyState icon="wallet" title="Data utang tidak ditemukan" text="Pilih pelanggan dari daftar utang." />
      </Page>
    )
  }

  const remaining = info.remaining
  const over = amount > remaining
  const kosong = amount <= 0
  const after = Math.max(0, remaining - amount)
  const chips = [...new Set([remaining, 50000, 100000])].filter((v) => v > 0 && v <= remaining).sort((a, b) => a - b)

  const submit = async () => {
    setTouched(true)
    if (kosong || over || pending) return
    try {
      await payDebt(info.customer.id, amount, method)
      replace('pembayaran-tersimpan', {
        customerId: info.customer.id,
        amount,
        remaining: after,
        method,
      })
    } catch (err) {
      toast(err.message)
    }
  }

  return (
    <Page
      bodyClass="narrow"
      footer={
        <Btn block onClick={submit} disabled={over || kosong || pending}>
          Simpan pembayaran
        </Btn>
      }
    >
      <PushHeader title="Catat pembayaran" onBack={back} />

      <div className="card" style={{ marginTop: 12 }}>
        <div className="small muted">Pelanggan</div>
        <div className="strong" style={{ fontSize: 18, marginTop: 2 }}>{info.customer.name}</div>
        <div className="small" style={{ marginTop: 6 }}>
          Sisa utang sekarang <strong style={{ color: 'var(--danger)' }}>{rupiah(remaining)}</strong>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <Field
          label="Jumlah dibayar"
          htmlFor="bayar-amount"
          error={
            touched && kosong
              ? 'Masukkan jumlah pembayaran.'
              : over
              ? `Melebihi sisa utang ${rupiah(remaining)}.`
              : null
          }
          hint={!amount ? 'Cicilan sebagian diperbolehkan.' : null}
        >
          <MoneyInput
            id="bayar-amount"
            value={amount}
            onChange={setAmount}
            invalid={over || (touched && kosong)}
            autoFocus
          />
        </Field>
      </div>

      <div className="chip-row-actions" style={{ marginTop: 12 }}>
        {chips.map((v) => (
          <button key={v} type="button" className="chip chip-sm" onClick={() => setAmount(v)}>
            {v === remaining ? 'Lunasi' : rupiah(v)}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <Field label="Metode" htmlFor="bayar-method">
          <select
            id="bayar-method"
            className="input"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option>Tunai</option>
            <option>Transfer</option>
          </select>
        </Field>
      </div>

      <div
        className={'card' + (over ? ' card-danger-bg' : ' card-soft')}
        style={{ marginTop: 18 }}
      >
        <div className="between">
          <span style={{ fontWeight: 800, color: over ? 'var(--danger)' : 'var(--primary)' }}>
            {over ? 'Melebihi sisa utang' : 'Sisa setelah bayar'}
          </span>
          <span
            className="num"
            style={{ fontWeight: 800, fontSize: 24, color: over ? 'var(--danger)' : 'var(--primary)' }}
          >
            {over ? rupiah(amount - remaining) : rupiah(after)}
          </span>
        </div>
      </div>
    </Page>
  )
}

/* -------------------------------- Tagih WA -------------------------------- */
function buildMessage(info, tone, storeName = 'Toko') {
  const name = info.customer.name
  const amount = rupiah(info.remaining)
  const due = fmtDate(info.dueDate)

  if (tone === 'ramah') {
    return `Halo ${name}, ini dari ${storeName} 😊\n\nSemoga harimu lancar. Kami mau mengingatkan dengan lembut bahwa ada catatan utang sebesar ${amount} yang jatuh tempo ${due}. Kalau sedang sibuk, tidak masalah — kabari saja kapan enaknya. Terima kasih banyak 🙏`
  }
  if (tone === 'tegas') {
    return `Halo ${name}, ini dari ${storeName}.\n\nCatatan utang sebesar ${amount} sudah melewati jatuh tempo ${due}. Mohon diselesaikan dalam 3 hari ke depan. Jika sudah dibayar, abaikan pesan ini. Terima kasih.`
  }
  return `Halo ${name}, ini dari ${storeName}.\nMengingatkan catatan utang sebesar ${amount} yang jatuh tempo ${due}. Mohon dapat dilunasi atau dikabari jadwal pembayarannya. Terima kasih 🙏`
}

export function TagihWA({ params, back, toast }) {
  const { debtOf, storeName } = useStore()
  const info = debtOf(params.customerId)
  const [tone, setTone] = useState('biasa')
  const [message, setMessage] = useState(() => (info ? buildMessage(info, 'biasa', storeName) : ''))

  useEffect(() => {
    if (info) setMessage(buildMessage(info, tone, storeName))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tone])

  if (!info) {
    return (
      <Page footer={<Btn block onClick={back}>Kembali</Btn>}>
        <PushHeader title="Tagih via WhatsApp" onBack={back} />
        <EmptyState icon="wa" title="Data utang tidak ditemukan" text="Pilih pelanggan dari daftar utang." />
      </Page>
    )
  }

  const open = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    const win = window.open(url, '_blank', 'noopener,noreferrer')
    toast(win ? 'WhatsApp dibuka — tekan kirim di sana' : 'Popup diblokir — izinkan popup untuk membuka WhatsApp')
  }

  return (
    <Page
      bodyClass="narrow"
      footer={
        <>
          <Btn block variant="wa" onClick={open}>
            <Icon name="wa" size={20} />
            Buka di WhatsApp
          </Btn>
          <button type="button" className="btn-text" style={{ width: '100%' }} onClick={back}>
            Batal
          </button>
        </>
      }
    >
      <PushHeader title="Tagih via WhatsApp" onBack={back} />

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ gap: 12 }}>
          <div className="avatar alert">{initials(info.customer.name)}</div>
          <div className="grow">
            <div className="strong" style={{ fontSize: 16.5 }}>{info.customer.name}</div>
            <div className="small muted num">{info.customer.phone || 'Nomor HP belum diisi'}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <Field label="Pesan yang dikirim" htmlFor="wa-msg">
          <textarea
            id="wa-msg"
            className="input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={7}
          />
        </Field>
      </div>

      <div className="tabs-inline" style={{ marginTop: 12, flexWrap: 'wrap' }}>
        {[
          { id: 'ramah', label: 'Ramah' },
          { id: 'biasa', label: 'Pengingat biasa' },
          { id: 'tegas', label: 'Tegas' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={'chip chip-sm' + (tone === t.id ? ' on' : '')}
            onClick={() => setTone(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="note" style={{ marginTop: 14 }}>
        Pesan dibuka di WhatsApp. Kamu tetap perlu menekan kirim sendiri.
      </p>
    </Page>
  )
}

/* --------------------------- Pembayaran tersimpan --------------------------- */
export function PembayaranTersimpan({ params, tab, toast }) {
  const { debtOf, storeName } = useStore()
  const info = debtOf(params.customerId)
  const lunas = params.remaining <= 0

  const sendProof = async () => {
    const text = [
      `Bukti pembayaran — ${storeName}`,
      `${info?.customer.name || 'Pelanggan'}`,
      `Tanggal: ${fmtDate(new Date())}`,
      `Jumlah dibayar: ${rupiah(params.amount)}`,
      `Metode: ${params.method}`,
      `Sisa utang: ${lunas ? 'Lunas' : rupiah(params.remaining)}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast('Bukti pembayaran disalin — tempel di WhatsApp')
    } catch {
      toast('Penyalinan diblokir browser')
    }
  }

  return (
    <div className="page">
      <div className="success">
        <div className="success-icon">
          <Icon name="check" size={44} strokeWidth={2.8} />
        </div>
        <h2>Pembayaran tersimpan</h2>
        <p className="success-sub">
          {info?.customer.name || 'Pelanggan'} membayar {rupiah(params.amount)}.
          <br />
          {lunas ? 'Utangnya sudah lunas.' : `Sisa utangnya sekarang ${rupiah(params.remaining)}.`}
        </p>

        <div className="card success-card">
          <KV label="Tanggal" value={fmtDate(new Date())} />
          <KV label="Metode" value={params.method} />
          <KV
            label="Sisa utang"
            value={lunas ? 'Lunas' : rupiah(params.remaining)}
            tone={lunas ? 'ok' : 'danger'}
          />
        </div>

        <p className="note" style={{ marginTop: 16, textAlign: 'center' }}>
          {lunas
            ? 'Status pelanggan otomatis berubah menjadi Lunas.'
            : 'Jika sisa utang sudah 0, status pelanggan otomatis berubah menjadi Lunas.'}
        </p>
      </div>

      <div className="page-foot">
        <Btn block onClick={() => tab('utang')}>Kembali ke daftar utang</Btn>
        <Btn block variant="ghost" style={{ marginTop: 10 }} onClick={sendProof}>
          <Icon name="wa" size={19} />
          Kirim bukti ke WA
        </Btn>
      </div>
    </div>
  )
}
