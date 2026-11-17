import { fmtDate, toISODate, digits, thousands, rupiah } from './lib/format'

/* ----------------------------- Icons ----------------------------- */
const PATHS = {
  home: (
    <>
      <path d="M3 10.6 12 3l9 7.6" />
      <path d="M5.6 9.6V20h12.8V9.6" />
    </>
  ),
  cart: (
    <>
      <circle cx="9.5" cy="20" r="1.35" />
      <circle cx="18" cy="20" r="1.35" />
      <path d="M2.6 3.2h2.3l2.5 12h12" />
      <path d="M6 7.2h14l-2 7.2H8" />
    </>
  ),
  box: (
    <>
      <path d="M12 2.9 21 7.1v9.8L12 21l-9-4.1V7.1L12 2.9Z" />
      <path d="M3 7.1 12 11.3 21 7.1" />
      <path d="M12 11.3V21" />
    </>
  ),
  chart: (
    <>
      <path d="M5 20v-8" />
      <path d="M12 20V4" />
      <path d="M19 20v-5.5" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10.2h18" />
      <circle cx="16.6" cy="14.6" r="1.15" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9.4a6 6 0 0 1 12 0c0 4 1.5 5.4 1.5 5.4h-15S6 13.4 6 9.4Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  right: <path d="M9 5l7 7-7 7" />,
  down: <path d="M5 9l7 7 7-7" />,
  check: <path d="M4 12.6l5.1 5.1L20 6.4" />,
  warn: (
    <>
      <path d="M12 3.6 22 20H2L12 3.6Z" />
      <path d="M12 9.6v4.4" />
      <circle cx="12" cy="17.1" r="0.95" fill="currentColor" stroke="none" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7.4V12l3.2 2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.6" />
      <path d="M15.9 15.9 20.6 20.6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.4" y="5" width="17.2" height="16" rx="3" />
      <path d="M3.4 10h17.2" />
      <path d="M8 2.8v4M16 2.8v4" />
    </>
  ),
  wa: (
    <>
      <path d="M12 3.2a8.8 8.8 0 0 0-7.5 13.4L3.3 20.7l4.3-1.1A8.8 8.8 0 1 0 12 3.2Z" />
      <path d="M8.9 9.1c0 2.9 2.6 5.4 5.5 5.4" />
    </>
  ),
  print: (
    <>
      <path d="M7 8.5V3.5h10v5" />
      <rect x="3.5" y="8.5" width="17" height="8" rx="2.5" />
      <path d="M7 14h10v6.5H7z" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  qr: (
    <>
      <rect x="3.4" y="3.4" width="6.6" height="6.6" rx="1.4" />
      <rect x="14" y="3.4" width="6.6" height="6.6" rx="1.4" />
      <rect x="3.4" y="14" width="6.6" height="6.6" rx="1.4" />
      <path d="M14 14h3v3h-3z" />
      <path d="M21 14v.01M14 21v.01M21 21v.01" />
    </>
  ),
  cash: (
    <>
      <rect x="2.6" y="6" width="18.8" height="12" rx="2.6" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20.2c1.5-3.6 4.4-5.2 8-5.2s6.5 1.6 8 5.2" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5v11" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4 19.5h16" />
    </>
  ),
  close: (
    <>
      <path d="M6.5 6.5 17.5 17.5" />
      <path d="M17.5 6.5 6.5 17.5" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2.6" />
      <path d="M15.5 5.5H6a2.5 2.5 0 0 0-2.5 2.5v9.5" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.35a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.97Z" />
    </>
  ),
}

export function Icon({ name, size = 24, strokeWidth = 1.9, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] || PATHS.box}
    </svg>
  )
}

/* ----------------------------- Layout ----------------------------- */
export function Page({ children, footer, bodyClass = '' }) {
  return (
    <div className="page">
      <div className={'page-body' + (bodyClass ? ' ' + bodyClass : '')}>{children}</div>
      {footer ? <div className="page-foot">{footer}</div> : null}
    </div>
  )
}

export function PushHeader({ title, onBack, right }) {
  return (
    <div className="push-header">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="Kembali">
          <Icon name="back" />
        </button>
      ) : null}
      <h1 className="grow truncate">{title}</h1>
      {right}
    </div>
  )
}

export function Btn({ variant = 'primary', block = false, size, className = '', children, ...rest }) {
  const cls = ['btn', `btn-${variant}`, block && 'btn-block', size && `btn-${size}`, className]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  )
}

export function Field({ label, hint, error, children, htmlFor }) {
  return (
    <div className="field">
      {label ? (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <div className="field-error">
          <Icon name="warn" size={15} strokeWidth={2.2} />
          <span>{error}</span>
        </div>
      ) : hint ? (
        <div className="field-hint">{hint}</div>
      ) : null}
    </div>
  )
}

export function MoneyInput({ value, onChange, placeholder = '0', invalid = false, id, autoFocus }) {
  return (
    <input
      id={id}
      className={'input num' + (invalid ? ' invalid' : '')}
      inputMode="numeric"
      autoComplete="off"
      autoFocus={autoFocus}
      value={value ? thousands(value) : ''}
      placeholder={placeholder}
      onChange={(e) => onChange(digits(e.target.value))}
    />
  )
}

export function DateField({ value, onChange, id }) {
  return (
    <div className="datewrap">
      <div className="input num" id={id}>
        <span>{fmtDate(value)}</span>
        <Icon name="calendar" size={22} />
      </div>
      <input
        type="date"
        aria-label="Pilih tanggal"
        value={toISODate(value)}
        onChange={(e) => e.target.value && onChange(new Date(e.target.value + 'T09:00:00'))}
      />
    </div>
  )
}

export function EmptyState({ icon = 'box', title, text, action, inline = false }) {
  return (
    <div className={'empty' + (inline ? ' inline' : '')}>
      <div className="empty-icon">
        <Icon name={icon} size={28} />
      </div>
      <h3>{title}</h3>
      {text ? <p>{text}</p> : null}
      {action}
    </div>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Pill({ children, tone }) {
  return <span className={'pill' + (tone ? ' ' + tone : '')}>{children}</span>
}

export function Stepper({ qty, onDec, onInc, max }) {
  return (
    <div className="stepper">
      <button type="button" onClick={onDec} aria-label="Kurangi jumlah">
        <Icon name="minus" size={15} strokeWidth={2.6} />
      </button>
      <span className="qty">{qty}</span>
      <button type="button" onClick={onInc} disabled={qty >= max} aria-label="Tambah jumlah">
        <Icon name="plus" size={15} strokeWidth={2.6} />
      </button>
    </div>
  )
}

export function Modal({ children, onClose, center = false }) {
  return (
    <div className={'overlay' + (center ? ' center' : '')} onClick={onClose}>
      <div className={'modal' + (center ? ' pop' : '')} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export function KV({ label, value, tone, big }) {
  return (
    <div className="kv">
      <span className="k">{label}</span>
      <span className={'v' + (tone ? ' ' + tone : '') + (big ? ' big' : '')}>{value}</span>
    </div>
  )
}

export function Avatar({ name, tone }) {
  const text = name
    ? name
        .replace(/\(.*?\)/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0] || '')
        .join('')
        .toUpperCase()
    : '?'
  return <div className={'avatar' + (tone ? ' ' + tone : '')}>{text}</div>
}

const TABS = [
  { id: 'home', label: 'Beranda', icon: 'home' },
  { id: 'kasir', label: 'Kasir', icon: 'cart' },
  { id: 'stok', label: 'Stok', icon: 'box' },
  { id: 'laporan', label: 'Laporan', icon: 'chart' },
  { id: 'utang', label: 'Utang', icon: 'wallet' },
]

export function SideNav({ active, onChange, storeName = 'Kasir UMKM', onSettings }) {
  return (
    <aside className="sidenav">
      <div className="sidenav-brand">
        <p className="eyebrow">Kasir UMKM</p>
        <strong>{storeName}</strong>
      </div>
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={'sidenav-item' + (active === t.id ? ' on' : '')}
          onClick={() => onChange(t.id)}
          aria-current={active === t.id ? 'page' : undefined}
        >
          <Icon name={t.icon} size={21} strokeWidth={active === t.id ? 2.3 : 1.9} />
          {t.label}
        </button>
      ))}
      {onSettings ? (
        <button type="button" className={'sidenav-item' + (active === 'pengaturan' ? ' on' : '')} onClick={onSettings}>
          <Icon name="gear" size={21} />
          Pengaturan
        </button>
      ) : null}
      <div className="sidenav-foot">
        Data tersimpan di PostgreSQL lokal.
        <br />
        Prototipe kasir UMKM.
      </div>
    </aside>
  )
}

export function TabBar({ active, onChange }) {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={'tab' + (active === t.id ? ' on' : '')}
          onClick={() => onChange(t.id)}
          aria-current={active === t.id ? 'page' : undefined}
        >
          <Icon name={t.icon} size={23} strokeWidth={active === t.id ? 2.3 : 1.8} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}

export { rupiah }
