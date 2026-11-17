import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { Page, Btn, EmptyState, Segmented, Icon, KV, rupiah } from '../ui.jsx'
import { DAYS_SHORT, fmtDate, fmtDateTime, isSameDay, startOfDay, toISODate } from '../lib/format'

const PERIODS = [
  { value: 'hari', label: 'Hari ini' },
  { value: 'minggu', label: 'Minggu ini' },
  { value: 'bulan', label: 'Bulan ini' },
]

export default function Laporan() {
  const { sales, stockIns, getProduct, toast } = useStore()
  const [period, setPeriod] = useState('minggu')

  const today = startOfDay(new Date())

  const from = useMemo(() => {
    if (period === 'hari') return today
    if (period === 'minggu') {
      const d = new Date(today)
      d.setDate(d.getDate() - 6)
      return d
    }
    return new Date(today.getFullYear(), today.getMonth(), 1)
  }, [period, today])

  const inRange = sales.filter((s) => {
    const t = startOfDay(s.date).getTime()
    return t >= from.getTime() && t <= today.getTime()
  })

  const omzet = inRange.reduce((s, x) => s + x.total, 0)
  const gross = inRange.reduce(
    (s, x) =>
      s +
      x.items.reduce((t, it) => {
        const p = getProduct(it.id)
        return t + (p ? (p.price - p.cost) * it.qty : 0)
      }, 0),
    0
  )
  const pengeluaran = stockIns
    .filter((si) => si.asExpense)
    .filter((si) => {
      const t = startOfDay(si.date).getTime()
      return t >= from.getTime() && t <= today.getTime()
    })
    .reduce((s, si) => s + si.qty * si.cost, 0)
  const untungBersih = gross - pengeluaran

  const chart = useMemo(() => {
    const valueOfDay = (d) => sales.filter((s) => isSameDay(s.date, d)).reduce((t, s) => t + s.total, 0)

    if (period !== 'bulan') {
      const labels = []
      const values = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        labels.push(DAYS_SHORT[d.getDay()])
        values.push(valueOfDay(d))
      }
      return { labels, values, active: 6, caption: '7 hari terakhir' }
    }

    const day = today.getDate()
    const buckets = []
    for (let start = 1; start <= day; start += 7) buckets.push({ start, end: Math.min(start + 6, day) })
    const values = buckets.map((b) => {
      let total = 0
      for (let d = b.start; d <= b.end; d++) {
        total += valueOfDay(new Date(today.getFullYear(), today.getMonth(), d))
      }
      return total
    })
    return {
      labels: buckets.map((b) => `${b.start}-${b.end}`),
      values,
      active: buckets.findIndex((b) => day >= b.start && day <= b.end),
      caption: 'per minggu',
    }
  }, [period, sales, today])

  const maxValue = Math.max(...chart.values, 1)

  const bestSellers = (() => {
    const map = new Map()
    inRange.forEach((s) =>
      s.items.forEach((it) => {
        const p = getProduct(it.id)
        if (!p) return
        const cur = map.get(it.id) || { product: p, qty: 0, revenue: 0 }
        cur.qty += it.qty
        cur.revenue += p.price * it.qty
        map.set(it.id, cur)
      })
    )
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 3)
  })()

  const judul = {
    hari: 'Omzet hari ini',
    minggu: 'Omzet minggu ini',
    bulan: 'Omzet bulan ini',
  }[period]

  const downloadCsv = () => {
    if (inRange.length === 0) {
      toast('Belum ada transaksi pada periode ini')
      return
    }
    const rows = [['Kode', 'Tanggal', 'Metode', 'Total']]
    inRange.forEach((s) => rows.push([s.code, fmtDateTime(s.date), s.method, s.total]))
    const csv = rows.map((r) => r.join(';')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-kasir-${toISODate(today)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(`${inRange.length} transaksi diunduh (CSV)`)
  }

  return (
    <Page footer={<Btn block variant="ghost" onClick={downloadCsv}>
      <Icon name="download" size={19} />
      Unduh laporan (CSV)
    </Btn>}>
      <h1 className="page-title" style={{ marginBottom: 16 }}>Laporan</h1>

      <Segmented options={PERIODS} value={period} onChange={setPeriod} />

      <div className="card" style={{ marginTop: 16 }}>
        <div className="muted small" style={{ fontWeight: 600 }}>{judul}</div>
        <div className="big-amount num" style={{ marginTop: 2, fontSize: 36 }}>{rupiah(omzet)}</div>
        <div className="small muted" style={{ marginTop: 4 }}>
          {inRange.length} transaksi · {fmtDate(from)} – {fmtDate(today)}
        </div>

        <div className="grid2" style={{ marginTop: 14 }}>
          <div className="card" style={{ background: 'var(--primary-soft)', borderColor: '#dcebe4', padding: 12 }}>
            <div className="small" style={{ color: 'var(--primary)', fontWeight: 600 }}>Untung bersih</div>
            <div className="num" style={{ color: 'var(--primary)', fontWeight: 800, fontSize: 18, marginTop: 2 }}>
              {rupiah(untungBersih)}
            </div>
          </div>
          <div className="card" style={{ background: '#f4f2ec', borderColor: '#eae6dc', padding: 12 }}>
            <div className="small muted" style={{ fontWeight: 600 }}>Pengeluaran</div>
            <div className="num" style={{ fontWeight: 800, fontSize: 18, marginTop: 2 }}>{rupiah(pengeluaran)}</div>
          </div>
        </div>
      </div>

      {inRange.length === 0 ? (
        <div className="card" style={{ marginTop: 16 }}>
          <EmptyState
            icon="chart"
            title="Belum ada transaksi"
            text={
              period === 'hari'
                ? 'Belum ada penjualan hari ini. Grafik akan terisi setelah transaksi pertama.'
                : 'Tidak ada penjualan pada periode ini. Coba ganti rentang waktu.'
            }
          />
        </div>
      ) : (
        <>
          <div className="report-grid">
          <div className="card" style={{ marginTop: 0 }}>
            <div className="between">
              <div className="strong" style={{ fontSize: 16.5 }}>Penjualan {chart.caption}</div>
              <span className="small muted">maks {rupiah(maxValue)}</span>
            </div>
            <div className="chart" style={{ marginTop: 14 }}>
              {chart.values.map((v, i) => (
                <div className="chart-col" key={chart.labels[i] + i}>
                  <div
                    className={'chart-bar' + (i === chart.active ? ' on' : '') + (v === 0 ? ' zero' : '')}
                    style={{ height: `${Math.max(3, (v / maxValue) * 100)}%` }}
                    title={rupiah(v)}
                  />
                  <span className={'chart-label' + (i === chart.active ? ' on' : '')}>{chart.labels[i]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: 0 }}>
            <div className="strong" style={{ fontSize: 16.5, marginBottom: 6 }}>Produk terlaris</div>
            {bestSellers.map((row, idx) => (
              <div key={row.product.id}>
                {idx > 0 ? <div className="divider" /> : null}
                <div className="between" style={{ padding: '13px 0' }}>
                  <div className="grow">
                    <div className="strong" style={{ fontSize: 15.5 }}>{row.product.name}</div>
                    <div className="small muted">{row.qty} terjual</div>
                  </div>
                  <span className="amount">{rupiah(row.revenue)}</span>
                </div>
              </div>
            ))}
          </div>

        </div>

          <div className="card" style={{ marginTop: 16, background: '#fbfaf7' }}>
            <KV label="Omzet" value={rupiah(omzet)} />
            <KV label="Laba kotor" value={rupiah(gross)} />
            <KV label="Pengeluaran barang" value={rupiah(pengeluaran)} />
            <div className="divider-dashed" style={{ margin: '8px 0' }} />
            <KV label="Untung bersih" value={rupiah(untungBersih)} tone="ok" big />
          </div>
        </>
      )}
    </Page>
  )
}
