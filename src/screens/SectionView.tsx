import { useState } from 'react'
import * as m from 'motion/react-m'
import { useStore } from '../store'
import { openReceipt } from '../nav'
import { calcReceipt } from '../lib/split'
import { categorize } from '../lib/categorize'
import { parseAmount, tenge, uid } from '../lib/money'
import { SECTIONS, type Hangout, type Person, type Receipt, type SectionKey } from '../types'
import { Press } from '../ui/Press'
import { Avatar, AvatarStack, Empty, Money, PeoplePicker } from '../ui/bits'
import { Sheet } from '../ui/Sheet'
import { IconCamera, IconPlus } from '../ui/icons'
import { snappy } from '../ui/motion'
import { useScan } from './Scan'

const DEFAULT_NAME: Record<SectionKey, string> = { event: 'Expense', dining: 'Dinner', transport: 'Taxi' }
const PLACEHOLDER: Record<SectionKey, string> = {
  event: 'Billiard, Football…',
  dining: 'Restaurant name',
  transport: 'Taxi, Yandex Go…',
}
const EMPTY: Record<SectionKey, [string, string, string]> = {
  event: ['🎱', 'No expenses yet', 'Billiard, football, tickets: anything the hangout was about.'],
  dining: ['🍽️', 'No receipts yet', 'Scan a receipt and drag items onto whoever had them.'],
  transport: ['🚕', 'No rides yet', 'Add each taxi with who paid and who rode along.'],
}

export function SectionView({
  hangout: h,
  section,
  onNeedPeople,
}: {
  hangout: Hangout
  section: SectionKey
  onNeedPeople: () => void
}) {
  const friends = useStore((s) => s.friends)
  const st = useStore.getState()
  const [quick, setQuick] = useState(false)
  const receipts = h.receipts.filter((r) => r.section === section)
  const total = receipts.reduce((s, r) => s + calcReceipt(r, friends).total, 0)
  const scan = useScan(section, (res) => {
    const id = st.addReceipt(h.id, {
      section,
      title: res.title || (res.items.length ? 'Receipt' : ''),
      service: res.service,
      items: res.items.map((it) => ({ ...it, id: uid() })),
    })
    openReceipt(id)
  })
  const guard = (fn: () => void) => () => (h.people.length ? fn() : onNeedPeople())
  const [emoji, title, text] = EMPTY[section]

  return (
    <>
      <div className="section-head">
        <h2>{SECTIONS[section].label}</h2>
        {total > 0 && <Money value={total} className="section-total" />}
      </div>

      {h.people.length === 0 ? (
        <>
          <Empty emoji="👋" title="Who's coming?" text="Add the people in this hangout first." />
          <Press className="btn primary wide" onClick={onNeedPeople}>
            Add people
          </Press>
        </>
      ) : receipts.length === 0 ? (
        <Empty emoji={emoji} title={title} text={text} />
      ) : (
        <div className="list">
          {receipts.map((r, i) => (
            <ReceiptCard key={r.id} r={r} friends={friends} i={i} />
          ))}
        </div>
      )}

      {h.people.length > 0 && (
        <div className="fab-row">
          {section === 'dining' && (
            <Press className="btn secondary float" onClick={guard(scan.pick)}>
              <IconCamera /> Scan
            </Press>
          )}
          <Press className="btn primary float" onClick={guard(() => setQuick(true))}>
            <IconPlus /> Add {SECTIONS[section].noun}
          </Press>
        </div>
      )}

      <Sheet open={quick} onClose={() => setQuick(false)} title={`New ${SECTIONS[section].noun}`}>
        {quick && <QuickForm hangout={h} section={section} onClose={() => setQuick(false)} />}
      </Sheet>
      {scan.ui}
    </>
  )
}

function ReceiptCard({ r, friends, i }: { r: Receipt; friends: Record<string, Person>; i: number }) {
  const c = calcReceipt(r, friends)
  const payer = r.payerId ? friends[r.payerId] : undefined
  const members = r.members.map((id) => friends[id]).filter(Boolean)
  return (
    <m.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...snappy, delay: i * 0.035 }}>
      <Press className="card receipt-card" onClick={() => openReceipt(r.id)}>
        <div className="rc-top">
          <span className="rc-title">{r.title || 'Untitled'}</span>
          <span className="rc-total num">{tenge(c.total)}</span>
        </div>
        <div className="rc-meta">
          {payer ? (
            <span className="rc-payer">
              <Avatar person={payer} size={20} /> {payer.name} paid
            </span>
          ) : (
            <span className="warn-text">Who paid?</span>
          )}
          <span>
            · {r.items.length} item{r.items.length === 1 ? '' : 's'}
          </span>
          {c.rate > 0 && <span className="badge good">−{Math.round(c.rate * 1000) / 10}%</span>}
          {r.service > 0 && <span className="badge">+{r.service}%</span>}
        </div>
        <AvatarStack people={members} size={22} />
      </Press>
    </m.div>
  )
}

function QuickForm({ hangout: h, section, onClose }: { hangout: Hangout; section: SectionKey; onClose: () => void }) {
  const friends = useStore((s) => s.friends)
  const people = h.people.map((id) => friends[id]).filter(Boolean)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [payer, setPayer] = useState(h.people[0])
  const [members, setMembers] = useState(h.people)
  const value = parseAmount(amount)

  const create = (itemize: boolean) => {
    const name = title.trim() || DEFAULT_NAME[section]
    const items = value > 0 ? [{ id: uid(), name, price: value, qty: 1, category: categorize(name, section), to: [] }] : []
    const id = useStore.getState().addReceipt(h.id, { section, title: name, payerId: payer, members, items })
    onClose()
    if (itemize) openReceipt(id)
  }

  return (
    <div className="form">
      <input className="field" placeholder={PLACEHOLDER[section]} value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="amount-field">
        <input
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.,\s]/g, ''))}
        />
        <span>₸</span>
      </label>
      <label className="label">Paid by</label>
      <PeoplePicker people={people} selected={[payer]} onToggle={setPayer} />
      <label className="label">Split between</label>
      <PeoplePicker
        people={people}
        selected={members}
        onToggle={(id) => setMembers((ms) => (ms.includes(id) ? ms.filter((x) => x !== id) : [...ms, id]))}
      />
      <Press className="btn primary wide" disabled={!(value > 0) || !members.length} onClick={() => create(false)}>
        Add{value > 0 ? ` ${tenge(value)}` : ''}
      </Press>
      <Press className="btn ghost wide" onClick={() => create(true)}>
        Itemize instead
      </Press>
    </div>
  )
}
