import { useState } from 'react'
import * as m from 'motion/react-m'
import { useStore } from '../store'
import { openHangout } from '../nav'
import { settle, shortDate } from '../lib/split'
import type { Hangout, Person } from '../types'
import { Press } from '../ui/Press'
import { AvatarStack, Empty, Money } from '../ui/bits'
import { IconPeople, IconPlus } from '../ui/icons'
import { snappy } from '../ui/motion'
import { FriendsSheet } from './People'

export function Home() {
  const hangouts = useStore((s) => s.hangouts)
  const friends = useStore((s) => s.friends)
  const [roster, setRoster] = useState(false)
  const st = useStore.getState()

  return (
    <div className="scroll">
      <header className="home-head">
        <div>
          <h1 className="large-title">Break the Bank</h1>
          <p className="tagline">Split the bill, keep the friends.</p>
        </div>
        <Press round className="icon-btn" onClick={() => setRoster(true)} aria-label="Friends">
          <IconPeople />
        </Press>
      </header>

      <Press className="btn primary big wide" onClick={() => openHangout(st.createHangout())}>
        <IconPlus /> New hangout
      </Press>

      {hangouts.length === 0 ? (
        <>
          <Empty emoji="🧾" title="No hangouts yet" text="Start one, add your friends, then scan or type in receipts." />
          <Press className="btn ghost wide" onClick={() => openHangout(st.loadDemo())}>
            Try a demo hangout
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
    </div>
  )
}

function HangoutCard({ h, friends, i }: { h: Hangout; friends: Record<string, Person>; i: number }) {
  const s = settle(h, friends)
  const n = s.transfers.length
  const people = h.people.map((id) => friends[id]).filter(Boolean)
  const status = s.total === 0 ? 'No expenses yet' : n ? `${n} transfer${n > 1 ? 's' : ''}` : 'All square ✓'
  return (
    <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...snappy, delay: i * 0.04 }}>
      <Press className="card hangout-card" onClick={() => openHangout(h.id)}>
        <div className="hc-top">
          <span className="hc-name">{h.name}</span>
          <Money value={s.total} className="hc-total" />
        </div>
        <div className="hc-bottom">
          <AvatarStack people={people} />
          <span className="hc-meta">
            {shortDate(h.date)} · <span className={n ? 'accent' : s.total ? 'good' : ''}>{status}</span>
            {h.dutch && ' · 🤝'}
          </span>
        </div>
      </Press>
    </m.div>
  )
}
