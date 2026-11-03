import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useStore, type Tab } from '../store'
import { back } from '../nav'
import { useT } from '../i18n'
import type { Hangout } from '../types'
import { Press } from '../ui/Press'
import { AddTile, Avatar, copyText } from '../ui/bits'
import { Sheet } from '../ui/Sheet'
import { IconBack, IconCopy, IconDining, IconEvent, IconLink, IconMore, IconSettle, IconShare, IconTransport } from '../ui/icons'
import { jelly } from '../ui/motion'
import { toast } from '../ui/toast'
import { shareHangout, shareLink } from '../sync'
import { PeopleSheet, PersonSheet } from './People'
import { SectionView } from './SectionView'
import { SettleView } from './SettleView'

const TABS: { key: Tab; Icon: () => React.JSX.Element }[] = [
  { key: 'event', Icon: IconEvent },
  { key: 'dining', Icon: IconDining },
  { key: 'transport', Icon: IconTransport },
  { key: 'settle', Icon: IconSettle },
]

const pad = (n: number) => String(n).padStart(2, '0')
const isoDay = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function HangoutView({ hangout: h }: { hangout: Hangout }) {
  const friends = useStore((s) => s.friends)
  const tab = useStore((s) => s.nav.tab)
  const st = useStore.getState()
  const t = useT()
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const people = h.people.map((id) => friends[id]).filter(Boolean)

  return (
    <>
      <div className="scroll">
        <div className="nav-row">
          <Press round className="icon-btn" onClick={back} aria-label="Back">
            <IconBack />
          </Press>
          <Press round className="icon-btn" onClick={() => setMenu(true)} aria-label="More">
            <IconMore />
          </Press>
        </div>
        <input
          className="title-input"
          value={h.name}
          onChange={(e) => st.updateHangout(h.id, { name: e.target.value })}
          aria-label="Hangout name"
        />
        <div className="meta-row">
          <label className="date-pill">
            {t.date(h.date)}
            <input
              type="date"
              value={isoDay(h.date)}
              onChange={(e) => {
                const [y, mo, d] = e.target.value.split('-').map(Number)
                if (y) st.updateHangout(h.id, { date: new Date(y, mo - 1, d, 12).getTime() })
              }}
            />
          </label>
          <span>{t.people(people.length)}</span>
        </div>

        <div className="picker people-row">
          {people.map((p) => (
            <Press key={p.id} round className="pick" onClick={() => setEditing(p.id)}>
              <span className="pick-ava">
                <Avatar person={p} size={48} />
              </span>
              <span className="pick-name">{p.name}</span>
            </Press>
          ))}
          <AddTile label={t.add} size={48} onClick={() => setPeopleOpen(true)} />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
          >
            {tab === 'settle' ? (
              <SettleView hangout={h} />
            ) : (
              <SectionView hangout={h} section={tab} onNeedPeople={() => setPeopleOpen(true)} />
            )}
          </m.div>
        </AnimatePresence>
      </div>

      <nav className="tabbar">
        {TABS.map(({ key, Icon }) => (
          <Press key={key} round className={`tab ${tab === key ? 'on' : ''}`} onClick={() => st.go({ tab: key })}>
            {tab === key && <m.span layoutId={`tab-${h.id}`} className="tab-pill" transition={jelly} />}
            <span className="tab-icon">
              <Icon />
            </span>
            <span className="tab-label">{key === 'settle' ? t.settle : t.sections[key].tab}</span>
          </Press>
        ))}
      </nav>

      <PeopleSheet open={peopleOpen} onClose={() => setPeopleOpen(false)} hangout={h} />
      <PersonSheet open={editing !== null} personId={editing} hangoutId={h.id} onClose={() => setEditing(null)} />
      <Sheet open={menu} onClose={() => setMenu(false)} title={h.name}>
        <ShareBlock hangout={h} />
        <p className="muted">{h.shareId ? t.deleteSharedNote : t.deleteHangoutNote}</p>
        <Press
          className="btn danger wide"
          onClick={() => {
            setMenu(false)
            st.deleteHangout(h.id)
            back()
          }}
        >
          {t.deleteHangout}
        </Press>
      </Sheet>
    </>
  )
}

function ShareBlock({ hangout: h }: { hangout: Hangout }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const link = h.shareId ? shareLink(h.shareId) : null
  const start = async () => {
    setBusy(true)
    const ok = await shareHangout(h.id)
    setBusy(false)
    if (!ok) toast(t.offline)
  }
  return (
    <div className="share">
      <div className="label">{t.shareHangout}</div>
      <p className="muted small">{t.shareNote}</p>
      {link ? (
        <>
          <div className="share-link">{link}</div>
          <div className="row-btns">
            <Press className="btn secondary" onClick={async () => toast((await copyText(link)) ? t.linkCopied : t.copyFailed)}>
              <IconCopy /> {t.copyLink}
            </Press>
            {'share' in navigator && (
              <Press className="btn secondary" onClick={() => navigator.share({ title: h.name, url: link }).catch(() => {})}>
                <IconShare /> {t.share}
              </Press>
            )}
          </div>
        </>
      ) : (
        <Press className="btn primary wide" disabled={busy} onClick={start}>
          <IconLink /> {busy ? '…' : t.shareHangout}
        </Press>
      )}
    </div>
  )
}
