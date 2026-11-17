import { useState } from 'react'
import { useStore } from '../store.jsx'
import { Page, PushHeader, Btn, Field, Modal, Icon, Avatar } from '../ui.jsx'

export default function Settings({ back, toast }) {
  const { settings, saveSettings, me, logout, pending } = useStore()
  const [name, setName] = useState(settings?.storeName || '')
  const [confirmOut, setConfirmOut] = useState(false)

  const save = async () => {
    if (pending) return
    const v = name.trim()
    if (v.length < 2) {
      toast('Nama toko minimal 2 karakter.')
      return
    }
    try {
      await saveSettings({ storeName: v })
      toast('Pengaturan disimpan')
      back()
    } catch (err) {
      toast(err.message)
    }
  }

  const doLogout = async () => {
    setConfirmOut(false)
    await logout()
  }

  return (
    <Page>
      <PushHeader title="Pengaturan" onBack={back} />

      <div className="stack" style={{ marginTop: 12, gap: 18 }}>
        <Field
          label="Nama toko"
          htmlFor="set-store"
          hint="Dipakai di beranda, struk, dan pesan tagihan WhatsApp."
        >
          <input id="set-store" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Btn block onClick={save} disabled={pending}>
          Simpan pengaturan
        </Btn>

        {me ? (
          <div className="card">
            <div className="row" style={{ gap: 12 }}>
              <Avatar name={me.name} tone="soft" />
              <div className="grow">
                <div className="strong" style={{ fontSize: 16.5 }}>{me.name}</div>
                <div className="small muted">
                  @{me.username} · {me.role === 'owner' ? 'Pemilik' : 'Staf'}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <Btn block variant="ghost" onClick={() => setConfirmOut(true)}>
          <Icon name="user" size={19} />
          Keluar dari aplikasi
        </Btn>
      </div>

      {confirmOut ? (
        <Modal center onClose={() => setConfirmOut(false)}>
          <h3>Keluar dari aplikasi?</h3>
          <p className="modal-sub">Kamu perlu login lagi untuk membuka kasir.</p>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setConfirmOut(false)}>Batal</Btn>
            <Btn onClick={doLogout}>Keluar</Btn>
          </div>
        </Modal>
      ) : null}
    </Page>
  )
}
