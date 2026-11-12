import { useState } from 'react'
import * as m from 'motion/react-m'
import { useStore } from '../store'
import { openHangout } from '../nav'
import { settle } from '../lib/split'
import { useT } from '../i18n'
import type { Hangout, Person } from '../types'
import { Press } from '../ui/Press'
import { AvatarStack, Empty, Money } from '../ui/bits'
import { IconGear, IconLink, IconPeople, IconPlus } from '../ui/icons'
import { snappy } from '../ui/motion'
import { FriendsSheet } from './People'
import { SettingsSheet } from './Settings'
import { Sheet } from '../ui/Sheet'
import { toast } from '../ui/toast'
import { joinHangout } from '../sync'

export function Home() {
  const hangouts = useStore((s) => s.hangouts)
  const friends = useStore((s) => s.friends)
  const [roster, setRoster] = useState(false)
  const [settings, setSettings] = useState(false)
  const [joining, setJoining] = useState(false)
  const st = useStore.getState()
  const t = useT()

  return (
    <div className="scroll">
      <header className="home-head">
        <div>
          <h1 className="large-title">Break the Bank</h1>
          <p className="tagline">{t.tagline}</p>
        </div>
        <div className="head-btns">
          <Press round className="icon-btn" onClick={() => setSettings(true)} aria-label={t.settings}>
            <IconGear />
          </Press>
          <Press round className="icon-btn" onClick={() => setRoster(true)} aria-label={t.friends}>
            <IconPeople />
          </Press>
        </div>
      </header>

      <div className="home-actions">
        <Press className="btn primary big wide" onClick={() => openHangout(st.createHangout())}>
          <IconPlus /> {t.newHangout}
        </Press>
        <Press className="btn ghost wide" onClick={() => setJoining(true)}>
          <IconLink /> {t.joinHangout}
        </Press>
      </div>

      {hangouts.length === 0 ? (
        <>
          <Empty emoji="🧾" title={t.noHangouts} text={t.noHangoutsText} />
          <Press className="btn ghost wide" onClick={() => openHangout(st.loadDemo())}>
            {t.tryDemo}
          </Press>
        </>
      ) : (
        <div className="list">
          {hangouts.map((h, i) => (
            <HangoutCard key={h.id} h={h} friends={friends} i={i} />
          ))}
        </div>
      )}
      <FriendsSheet open={roster} onClose={() => setRoster(false)} />
      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
      <JoinSheet open={joining} onClose={() => setJoining(false)} />
    </div>
  )
}

function HangoutCard({ h, friends, i }: { h: Hangout; friends: Record<string, Person>; i: number }) {
  const t = useT()
  const s = settle(h, friends)
  const n = s.transfers.length
  const people = h.people.map((id) => friends[id]).filter(Boolean)
  const status = s.total === 0 ? t.noExpenses : n ? t.nTransfers(n) : t.noDebts
  return (
    <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...snappy, delay: i * 0.04 }}>
      <Press className="card hangout-card" onClick={() => openHangout(h.id)}>
        <div className="hc-top">
          <span className="hc-name">{h.name}</span>
          <span className="lead" />
          <Money value={s.total} className="hc-total" />
        </div>
        <div className="hc-bottom">
          <AvatarStack people={people} />
          <span className="hc-meta">
            {t.date(h.date)} · <span className={n ? 'accent' : s.total ? 'good' : ''}>{status}</span>
            {h.dutch && ' · 🇳🇱'}
            {h.shareId && ' · 🔗'}
          </span>
        </div>
      </Press>
    </m.div>
  )
}

function JoinSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const join = async () => {
    setBusy(true)
    const id = await joinHangout(code)
    setBusy(false)
    if (!id) return toast(t.joinFailed)
    setCode('')
    onClose()
    openHangout(id)
  }
  return (
    <Sheet open={open} onClose={onClose} title={t.joinHangout}>
      <div className="form">
        <p className="muted">{t.joinHint}</p>
        <input
          className="field"
          placeholder="https://…/?join=…"
          value={code}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && code.trim() && !busy && join()}
        />
        <Press className="btn primary wide" disabled={!code.trim() || busy} onClick={join}>
          {busy ? '…' : t.join}
        </Press>
      </div>
    </Sheet>
  )
}
