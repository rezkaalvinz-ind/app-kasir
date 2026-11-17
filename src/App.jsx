import { useState } from 'react'
import { useStore } from './store.jsx'
import { TabBar, SideNav, Icon, Btn } from './ui.jsx'
import Home from './screens/Home.jsx'
import Kasir from './screens/Kasir.jsx'
import { BayarTunai, Qris, PilihPelanggan, TransaksiSelesai } from './screens/Payments.jsx'
import Stok, { TambahProduk, BarangMasuk, StokTersimpan } from './screens/Stock.jsx'
import Laporan from './screens/Report.jsx'
import Utang, { DetailUtang, CatatPembayaran, TagihWA, PembayaranTersimpan } from './screens/Debts.jsx'
import Login from './screens/Login.jsx'
import Settings from './screens/Settings.jsx'

const SCREENS = {
  home: Home,
  kasir: Kasir,
  stok: Stok,
  laporan: Laporan,
  utang: Utang,
  'produk-baru': TambahProduk,
  'barang-masuk': BarangMasuk,
  'stok-tersimpan': StokTersimpan,
  'bayar-tunai': BayarTunai,
  qris: Qris,
  'pilih-pelanggan': PilihPelanggan,
  'transaksi-selesai': TransaksiSelesai,
  'detail-utang': DetailUtang,
  'catat-pembayaran': CatatPembayaran,
  'tagih-wa': TagihWA,
  'pembayaran-tersimpan': PembayaranTersimpan,
  pengaturan: Settings,
}

const TAB_ROUTES = ['home', 'kasir', 'stok', 'laporan', 'utang']

function BootFrame({ children }) {
  return (
    <div className="boot-shell">
      <div className="boot">{children}</div>
    </div>
  )
}

export default function App() {
  const { toastMsg, status, error, refresh, storeName } = useStore()
  const [stack, setStack] = useState([{ name: 'home', params: {} }])
  const route = stack[stack.length - 1]

  const nav = (name, params = {}) => setStack((s) => [...s, { name, params }])
  const replace = (name, params = {}) => setStack((s) => [...s.slice(0, -1), { name, params }])
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  const tab = (name) => setStack([{ name, params: {} }])
  const home = () => setStack([{ name: 'home', params: {} }])

  if (status === 'loading') {
    return (
      <BootFrame>
        <div className="boot-spinner" />
        <h2>Menghubungkan ke database…</h2>
        <p className="note" style={{ textAlign: 'center' }}>
          Mengambil data dari PostgreSQL lewat API lokal.
        </p>
      </BootFrame>
    )
  }

  if (status === 'anon') {
    return <Login />
  }

  if (status === 'error') {
    return (
      <BootFrame>
        <div className="empty-icon">
          <Icon name="warn" size={28} />
        </div>
        <h2>Database belum tersambung</h2>
        <p className="note" style={{ textAlign: 'center', marginBottom: 16 }}>
          {error || 'API tidak merespons.'}
        </p>
        <Btn onClick={refresh}>Coba lagi</Btn>
        <p className="note small" style={{ textAlign: 'center', marginTop: 16 }}>
          Jalankan <code>npm start</code> di folder proyek, lalu muat ulang halaman ini.
        </p>
      </BootFrame>
    )
  }

  const Current = SCREENS[route.name] || Home

  const isTab = TAB_ROUTES.includes(route.name)

  return (
    <div className="app-shell">
      <SideNav
        active={isTab ? route.name : null}
        onChange={tab}
        storeName={storeName}
        onSettings={() => nav('pengaturan')}
      />
      <div className="app-main">
        <div className="screen">
          <Current
            key={stack.length + ':' + route.name}
            params={route.params}
            nav={nav}
            replace={replace}
            back={back}
            tab={tab}
            home={home}
          />
          {toastMsg ? <div className="toast">{toastMsg}</div> : null}
        </div>
        {isTab ? <TabBar active={route.name} onChange={tab} /> : null}
      </div>
    </div>
  )
}
