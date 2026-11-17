import { useState } from 'react'
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
import { fmtDate } from '../lib/format'

const CATEGORIES = ['Makanan', 'Minuman', 'Sembako', 'Lainnya']
const UNITS = ['pcs', 'pack', 'kg', 'liter', 'botol', 'bungkus']

/* -------------------------------- Stok -------------------------------- */
export default function Stok({ nav }) {
  const { products } = useStore()
  const [q, setQ] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)

  const low = products.filter((p) => p.stock <= p.minStock)
  const totalValue = products.reduce((s, p) => s + p.stock * p.cost, 0)
  const query = q.trim().toLowerCase()
  const filtered = products.filter(
    (p) => (!onlyLow || p.stock <= p.minStock) && p.name.toLowerCase().includes(query)
  )

  return (
    <Page>
      <h1 className="page-title" style={{ marginBottom: 14 }}>Stok produk</h1>

      <div className="btn-row" style={{ marginBottom: 16 }}>
        <Btn variant="ghost" size="sm" onClick={() => nav('produk-baru')}>
          <Icon name="plus" size={18} strokeWidth={2.4} />
          Produk
        </Btn>
        <Btn variant="primary" size="sm" onClick={() => nav('barang-masuk')}>
          <Icon name="plus" size={18} strokeWidth={2.4} />
          Barang masuk
        </Btn>
      </div>

      <div className="grid2">
        <button
          type="button"
          className="card card-btn"
          style={{
            background: 'var(--danger-bg)',
            borderColor: onlyLow ? '#e0a9a2' : 'var(--danger-border)',
            padding: 16,
          }}
          onClick={() => setOnlyLow((v) => !v)}
        >
          <div className="small" style={{ color: 'var(--danger)', fontWeight: 700 }}>Stok habis / menipis</div>
          <div className="num" style={{ fontSize: 26, fontWeight: 800, color: 'var(--danger)', marginTop: 4 }}>
            {low.length} produk
          </div>
          <div className="small" style={{ color: 'var(--danger)', marginTop: 2 }}>
            {onlyLow ? 'Menampilkan hanya menipis' : 'Tap untuk filter'}
          </div>
        </button>

        <div className="card" style={{ padding: 16 }}>
          <div className="small muted" style={{ fontWeight: 600 }}>Nilai stok</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
            {rupiah(totalValue)}
          </div>
          <div className="small muted" style={{ marginTop: 2 }}>Modal barang tersisa</div>
        </div>
      </div>

      <div className="search" style={{ marginTop: 16 }}>
        <Icon name="search" size={21} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari produk"
          aria-label="Cari produk"
        />
      </div>

      {products.length === 0 ? (
        <div className="card" style={{ marginTop: 16 }}>
          <EmptyState
            icon="box"
            title="Belum ada produk"
            text="Tambahkan produk pertama supaya stok bisa dipantau."
            action={<Btn size="sm" onClick={() => nav('produk-baru')}>Tambah produk</Btn>}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ marginTop: 16 }}>
          <EmptyState
            icon="search"
            title="Tidak ada produk yang cocok"
            text={onlyLow ? 'Tidak ada produk menipis saat ini.' : `Tidak ada produk dengan nama “${q}”.`}
            action={
              <Btn
                size="sm"
                variant="ghost"
                onClick={() => {
                  setQ('')
                  setOnlyLow(false)
                }}
              >
                Reset filter
              </Btn>
            }
          />
        </div>
      ) : (
        <div className="stock-list" style={{ marginTop: 16 }}>
          {filtered.map((p) => {
            const isLow = p.stock <= p.minStock
            const habis = p.stock === 0
            return (
              <button
                key={p.id}
                type="button"
                className={'card card-btn between' + (isLow ? ' card-alert' : '')}
                onClick={() => nav('produk-baru', { productId: p.id })}
                title="Ketuk untuk mengubah produk"
              >
                <div className="grow">
                  <div className="strong" style={{ fontSize: 16.5 }}>{p.name}</div>
                  <div className="small muted num" style={{ marginTop: 2 }}>
                    Batas minimum {p.minStock} · {rupiah(p.price)}
                  </div>
                </div>
                <span className={'pill' + (isLow ? ' low' : '')}>
                  {habis ? 'Habis' : `Sisa ${p.stock}`}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </Page>
  )
}

/* ------------------------- Tambah / ubah produk ------------------------- */
export function TambahProduk({ back, params, toast }) {
  const { addProduct, updateProduct, deleteProduct, getProduct, pending } = useStore()
  const editing = Boolean(params?.productId)
  const product = editing ? getProduct(params.productId) : null
  const [form, setForm] = useState(() =>
    product
      ? {
          name: product.name,
          category: product.category,
          cost: product.cost,
          price: product.price,
          minStock: product.minStock,
          unit: product.unit,
        }
      : {
          name: '',
          category: 'Makanan',
          cost: 0,
          price: 0,
          stock: 0,
          minStock: 5,
          unit: 'pcs',
        }
  )
  const [errors, setErrors] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const margin = form.price - form.cost

  const submit = async () => {
    const e = {}
    if (form.name.trim().length < 2) e.name = 'Nama produk wajib diisi (minimal 2 karakter).'
    if (form.price <= 0) e.price = 'Harga jual wajib diisi.'
    if (form.price > 0 && form.cost > 0 && form.price < form.cost) {
      e.price = 'Harga jual lebih kecil dari harga beli — cek lagi.'
    }
    setErrors(e)
    if (Object.keys(e).length || pending) return
    const payload = {
      name: form.name.trim(),
      category: form.category,
      cost: form.cost,
      price: form.price,
      minStock: form.minStock,
      unit: form.unit,
    }
    try {
      if (editing) {
        await updateProduct(product.id, payload)
        toast('Perubahan produk disimpan')
      } else {
        await addProduct({ ...payload, stock: form.stock })
        toast('Produk baru disimpan')
      }
      back()
    } catch (err) {
      toast(err.message)
    }
  }

  const doDelete = async () => {
    try {
      await deleteProduct(product.id)
      toast('Produk dihapus')
      back()
    } catch (err) {
      setConfirmDelete(false)
      toast(err.message)
    }
  }

  return (
    <Page bodyClass="narrow" footer={<Btn block onClick={submit} disabled={pending}>{editing ? 'Simpan perubahan' : 'Simpan produk'}</Btn>}>
      <PushHeader title={editing ? 'Ubah produk' : 'Tambah produk'} onBack={back} />

      <div className="stack" style={{ marginTop: 12, gap: 18 }}>
        <Field label="Nama produk" htmlFor="p-name" error={errors.name}>
          <input
            id="p-name"
            className={'input' + (errors.name ? ' invalid' : '')}
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
            placeholder="Contoh: Kopi Kapal Api 65 g"
          />
        </Field>

        <Field label="Kategori" htmlFor="p-cat">
          <select id="p-cat" className="input" value={form.category} onChange={(e) => set('category')(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>

        <div className="field-grid">
          <Field label="Harga beli" htmlFor="p-cost">
            <MoneyInput id="p-cost" value={form.cost} onChange={set('cost')} />
          </Field>
          <Field label="Harga jual" htmlFor="p-price" error={errors.price}>
            <MoneyInput id="p-price" value={form.price} onChange={set('price')} invalid={!!errors.price} />
          </Field>
        </div>

        {form.cost > 0 && form.price > 0 && !errors.price ? (
          <div className="note" style={{ marginTop: -6 }}>
            Untung per {form.unit}: <strong style={{ color: 'var(--primary)' }}>{rupiah(margin)}</strong>
            {margin > 0 ? ` (${Math.round((margin / form.price) * 100)}% dari harga jual)` : ''}
          </div>
        ) : null}

        <div className="field-grid">
          {editing ? (
            <Field label="Stok sekarang" htmlFor="p-stock">
              <input id="p-stock" className="input num" value={String(product?.stock ?? 0)} readOnly />
            </Field>
          ) : (
            <Field label="Stok awal" htmlFor="p-stock">
              <MoneyInput id="p-stock" value={form.stock} onChange={set('stock')} placeholder="0" />
            </Field>
          )}
          <Field label="Batas stok menipis" htmlFor="p-min">
            <MoneyInput id="p-min" value={form.minStock} onChange={set('minStock')} placeholder="5" />
          </Field>
        </div>

        <Field label="Satuan" htmlFor="p-unit">
          <select id="p-unit" className="input" value={form.unit} onChange={(e) => set('unit')(e.target.value)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Field>

        {editing ? (
          <>
            <div className="divider" style={{ margin: '4px 0' }} />
            <p className="note">
              Stok diubah lewat <strong>Barang masuk</strong>, bukan dari sini.
            </p>
            <Btn block variant="ghost" style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }} onClick={() => setConfirmDelete(true)}>
              <Icon name="warn" size={19} />
              Hapus produk
            </Btn>
          </>
        ) : (
          <p className="note">
            Jika stok awal diisi, sistem otomatis mencatat barang masuk pertama.
          </p>
        )}
      </div>

      {confirmDelete ? (
        <Modal center onClose={() => setConfirmDelete(false)}>
          <h3>Hapus produk?</h3>
          <p className="modal-sub">
            “{product?.name}” akan dihapus dari daftar produk. Produk yang sudah pernah terjual atau pernah dicatat barang masuk tidak bisa dihapus.
          </p>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setConfirmDelete(false)}>Batal</Btn>
            <Btn style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={doDelete} disabled={pending}>
              Hapus
            </Btn>
          </div>
        </Modal>
      ) : null}
    </Page>
  )
}

/* ---------------------------- Barang masuk ---------------------------- */
export function BarangMasuk({ back, replace, nav }) {
  const { products, getProduct, addStock, toast, pending } = useStore()
  const [productId, setProductId] = useState(products[0]?.id || '')
  const [date, setDate] = useState(new Date())
  const [supplier, setSupplier] = useState('')
  const [qty, setQty] = useState(0)
  const [cost, setCost] = useState(0)
  const [asExpense, setAsExpense] = useState(false)
  const [errors, setErrors] = useState({})

  const product = getProduct(productId)
  const after = (product?.stock || 0) + qty
  const modal = qty * cost

  if (products.length === 0) {
    return (
      <Page footer={<Btn block onClick={back}>Kembali</Btn>}>
        <PushHeader title="Barang masuk" onBack={back} />
        <EmptyState
          icon="box"
          title="Belum ada produk"
          text="Barang masuk butuh produk tujuan. Tambahkan produk dulu."
          action={<Btn size="sm" onClick={() => nav('produk-baru')}>Tambah produk</Btn>}
        />
      </Page>
    )
  }

  const submit = async () => {
    const e = {}
    if (!product) e.product = 'Pilih produk dulu.'
    if (qty <= 0) e.qty = 'Jumlah masuk minimal 1.'
    if (cost <= 0) e.cost = 'Harga beli per pcs wajib diisi.'
    setErrors(e)
    if (Object.keys(e).length || pending) return
    try {
      await addStock({
        productId,
        qty,
        cost,
        date,
        supplier: supplier.trim(),
        asExpense,
      })
      replace('stok-tersimpan', {
        productId,
        qty,
        before: product.stock,
        after,
        cost,
        date,
      })
    } catch (err) {
      toast(err.message)
    }
  }

  return (
    <Page bodyClass="narrow" footer={<Btn block onClick={submit} disabled={pending}>Simpan barang masuk</Btn>}>
      <PushHeader title="Barang masuk" onBack={back} />

      <div className="stack" style={{ marginTop: 12, gap: 18 }}>
        <Field label="Tanggal masuk" htmlFor="bm-date">
          <DateField id="bm-date" value={date} onChange={setDate} />
        </Field>

        <Field label="Supplier (opsional)" htmlFor="bm-supplier">
          <input
            id="bm-supplier"
            className="input"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="Contoh: Grosir Maju Jaya"
          />
        </Field>

        <Field label="Produk" htmlFor="bm-product" error={errors.product}>
          <select
            id="bm-product"
            className="input"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — sisa {p.stock}
              </option>
            ))}
          </select>
        </Field>

        <div className="field-grid">
          <Field label="Jumlah masuk" htmlFor="bm-qty" error={errors.qty}>
            <MoneyInput id="bm-qty" value={qty} onChange={setQty} invalid={!!errors.qty} />
          </Field>
          <Field label="Harga beli / pcs" htmlFor="bm-cost" error={errors.cost}>
            <MoneyInput id="bm-cost" value={cost} onChange={setCost} invalid={!!errors.cost} />
          </Field>
        </div>

        <div className="card" style={{ background: '#fff' }}>
          <KV label="Stok sekarang" value={`${product?.stock ?? 0}`} />
          <KV
            label="Setelah ditambah"
            value={
              <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{after}</span>
            }
          />
          <div className="divider-dashed" style={{ margin: '8px 0' }} />
          <KV label="Total modal masuk" value={rupiah(modal)} big />
        </div>

        <label className="check">
          <input type="checkbox" checked={asExpense} onChange={(e) => setAsExpense(e.target.checked)} />
          <span>Catat sebagai pengeluaran juga (untuk laporan untung rugi)</span>
        </label>
      </div>
    </Page>
  )
}

/* --------------------------- Stok tersimpan --------------------------- */
export function StokTersimpan({ params, tab, replace }) {
  const { getProduct, me } = useStore()
  const product = getProduct(params.productId)

  return (
    <div className="page">
      <div className="success">
        <div className="success-icon">
          <Icon name="check" size={44} strokeWidth={2.8} />
        </div>
        <h2>Stok berhasil ditambah</h2>
        <p className="success-sub">
          {product?.name || 'Produk'} bertambah {params.qty} pcs.
          <br />
          Stok sekarang {params.after} pcs.
        </p>

        <div className="card success-card">
          <KV label="Tanggal" value={fmtDate(params.date)} />
          <KV label="Modal masuk" value={rupiah(params.qty * params.cost)} />
          <KV label="Dicatat oleh" value={me?.name || 'Pemilik'} />
        </div>
      </div>

      <div className="page-foot">
        <Btn block onClick={() => tab('stok')}>Kembali ke stok</Btn>
        <Btn block variant="ghost" style={{ marginTop: 10 }} onClick={() => replace('barang-masuk', {})}>
          Tambah barang masuk lagi
        </Btn>
      </div>
    </div>
  )
}
