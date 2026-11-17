import { useState } from 'react'
import { useStore } from '../store.jsx'
import { Btn, Field, Icon } from '../ui.jsx'

export default function Login() {
  const { login, register, pending, settings, storeName } = useStore()
  const [mode, setMode] = useState('login') // login | daftar
  const [form, setForm] = useState({ name: '', username: '', password: '' })
  const [error, setError] = useState(null)

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async () => {
    if (pending) return
    setError(null)
    if (mode === 'login') {
      if (!form.username.trim() || !form.password) {
        setError('Isi username dan password dulu.')
        return
      }
      try {
        await login(form.username.trim(), form.password)
      } catch (err) {
        setError(err.message)
      }
      return
    }
    // mode daftar
    const e = {}
    if (form.name.trim().length < 2) e.name = 'Nama minimal 2 karakter.'
    if (form.username.trim().length < 3) e.username = 'Username minimal 3 karakter.'
    if (form.password.length < 6) e.password = 'Password minimal 6 karakter.'
    setError(e.name || e.username || e.password || null)
    if (e.name || e.username || e.password) return
    try {
      await register(form.name.trim(), form.username.trim(), form.password)
    } catch (err) {
      setError(err.message)
    }
  }

  const switchMode = (m) => {
    setMode(m)
    setError(null)
  }

  const title = mode === 'login' ? (storeName || 'Kasir UMKM') : 'Daftar akun baru'

  return (
    <div className="boot-shell">
      <div className="boot">
        <div className="empty-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
          <Icon name={mode === 'login' ? 'wallet' : 'user'} size={30} />
        </div>
        <h2 style={{ textAlign: 'center' }}>{title}</h2>
        <p className="note" style={{ textAlign: 'center', marginBottom: 20 }}>
          {mode === 'login'
            ? 'Masuk dulu untuk membuka aplikasi kasir.'
            : `Buat akun untuk mulai memakai ${storeName || 'kasir'}.`}
        </p>

        <form onSubmit={(e) => { e.preventDefault(); submit() }}>
          {mode === 'daftar' ? (
            <Field label="Nama kamu" htmlFor="reg-name">
              <input
                id="reg-name"
                className={'input' + (error ? ' invalid' : '')}
                value={form.name}
                onChange={(e) => set('name')(e.target.value)}
                placeholder="Contoh: Sari Wulandari"
                autoFocus
              />
            </Field>
          ) : null}

          <Field label="Username" htmlFor="auth-user">
            <input
              id="auth-user"
              className={'input' + (error ? ' invalid' : '')}
              value={form.username}
              onChange={(e) =>
                set('username')(e.target.value.toLowerCase().replace(/\s+/g, ''))
              }
              placeholder={mode === 'daftar' ? 'huruf kecil, tanpa spasi' : 'pemilik'}
              autoComplete="username"
              autoFocus={mode === 'login'}
            />
          </Field>

          <Field
            label="Password"
            htmlFor="auth-pass"
            error={error}
            hint={mode === 'daftar' ? 'Minimal 6 karakter.' : null}
          >
            <input
              id="auth-pass"
              type="password"
              className={'input' + (error ? ' invalid' : '')}
              value={form.password}
              onChange={(e) => set('password')(e.target.value)}
              placeholder={mode === 'daftar' ? 'Buat password' : '••••••••'}
              autoComplete={mode === 'daftar' ? 'new-password' : 'current-password'}
            />
          </Field>

          <Btn block onClick={submit} disabled={pending}>
            {pending ? 'Memeriksa…' : mode === 'login' ? 'Masuk' : 'Daftar & masuk'}
          </Btn>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          {mode === 'login' ? (
            <>
              <button type="button" className="btn-text" onClick={() => switchMode('daftar')}>
                Belum punya akun? <strong style={{ color: 'var(--primary)' }}>Daftar</strong>
              </button>
              <p className="note small" style={{ marginTop: 10 }}>
                Akun awal: <code>pemilik</code> / <code>kasir123</code>
              </p>
            </>
          ) : (
            <button type="button" className="btn-text" onClick={() => switchMode('login')}>
              Sudah punya akun? <strong style={{ color: 'var(--primary)' }}>Masuk</strong>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
