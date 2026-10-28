import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useStore, type Tab } from '../store'
import { back } from '../nav'
import { shortDate } from '../lib/split'
import type { Hangout } from '../types'
import { Press } from '../ui/Press'
import { AddTile, Avatar } from '../ui/bits'
import { Sheet } from '../ui/Sheet'
import { IconBack, IconDining, IconEvent, IconMore, IconSettle, IconTransport } from '../ui/icons'
import { jelly } from '../ui/motion'
import { PeopleSheet, PersonSheet } from './People'
import { SectionView } from './SectionView'
import { SettleView } from './SettleView'

const TABS: { key: Tab; label: string; Icon: () => React.JSX.Element }[] = [
  { key: 'event', label: 'Event', Icon: IconEvent },
  { key: 'dining', label: 'Dining', Icon: IconDining },
  { key: 'transport', label: 'Transport', Icon: IconTransport },
  { key: 'settle', label: 'Settle', Icon: IconSettle },
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
            {shortDate(h.date)}
            <input
              type="date"
              value={isoDay(h.date)}
              onChange={(e) => {
                const [y, mo, d] = e.target.value.split('-').map(Number)
                if (y) st.updateHangout(h.id, { date: new Date(y, mo - 1, d, 12).getTime() })
              }}
            />
          </label>
          <span>
            {people.length} {people.length === 1 ? 'person' : 'people'}
          </span>
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
          <AddTile label="Add" size={48} onClick={() => setPeopleOpen(true)} />
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
        {TABS.map(({ key, label, Icon }) => (
          <Press key={key} round className={`tab ${tab === key ? 'on' : ''}`} onClick={() => st.go({ tab: key })}>
            {tab === key && <m.span layoutId={`tab-${h.id}`} className="tab-pill" transition={jelly} />}
            <span className="tab-icon">
              <Icon />
            </span>
            <span className="tab-label">{label}</span>
          </Press>
        ))}
      </nav>

      <PeopleSheet open={peopleOpen} onClose={() => setPeopleOpen(false)} hangout={h} />
      <PersonSheet open={editing !== null} personId={editing} hangoutId={h.id} onClose={() => setEditing(null)} />
      <Sheet open={menu} onClose={() => setMenu(false)} title={h.name}>
        <p className="muted">Deleting removes all receipts in this hangout. Friends stay saved.</p>
        <Press
          className="btn danger wide"
          onClick={() => {
            setMenu(false)
            st.deleteHangout(h.id)
            back()
          }}
        >
          Delete hangout
        </Press>
      </Sheet>
    </>
  )
}
