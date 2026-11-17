// Semua format angka & tanggal dipusatkan di sini supaya seragam di 16 layar.

const nf = new Intl.NumberFormat('id-ID')

export const pad = (n) => String(n).padStart(2, '0')

/** Angka -> "Rp 1.275.000" (selalu penuh, tanpa singkatan "jt"). */
export function rupiah(value) {
  const n = Math.round(Number(value) || 0)
  return (n < 0 ? '-Rp ' : 'Rp ') + nf.format(Math.abs(n))
}

/** Angka -> "20.000" untuk nilai input. */
export const thousands = (value) => nf.format(Math.round(Number(value) || 0))

/** Ambil digit saja dari input bebas -> number. */
export const digits = (text) => Number(String(text).replace(/[^\d]/g, '') || 0)

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

/** 14 Nov 2026 */
export function fmtDate(value) {
  const d = new Date(value)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/** 14 Nov 2026, 08.01 */
export function fmtDateTime(value) {
  const d = new Date(value)
  return `${fmtDate(d)}, ${pad(d.getHours())}.${pad(d.getMinutes())}`
}

/** yyyy-mm-dd untuk <input type="date"> */
export function toISODate(value) {
  const d = new Date(value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const startOfDay = (value) => {
  const d = new Date(value)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Selisih hari dari hari ini (negatif = sudah lewat). */
export function daysFromToday(value) {
  const a = startOfDay(new Date())
  const b = startOfDay(value)
  return Math.round((b - a) / 86400000)
}

/** "jatuh tempo hari ini" / "lewat 4 hari" / "5 hari lagi" */
export function relativeDue(value) {
  const n = daysFromToday(value)
  if (n === 0) return 'jatuh tempo hari ini'
  if (n < 0) return `lewat ${Math.abs(n)} hari`
  return `${n} hari lagi`
}

export const isSameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime()

export const initials = (name = '') =>
  name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()
