import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useStore } from '../store'
import { openReceipt } from '../nav'
import { calcReceipt } from '../lib/split'
import { categorize } from '../lib/categorize'
import { parseAmount, tenge, uid } from '../lib/money'
import { useT } from '../i18n'
import type { Hangout, Person, Receipt, SectionKey } from '../types'
import { Press } from '../ui/Press'
import { Avatar, AvatarStack, Empty, Money, PeoplePicker, Switch } from '../ui/bits'
import { Sheet } from '../ui/Sheet'
import { IconPlus } from '../ui/icons'
import { snappy } from '../ui/motion'

const EMPTY_EMOJI: Record<SectionKey, string> = { event: '🎱', dining: '🍽️', transport: '🚕' }

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
  const t = useT()
  const sec = t.sections[section]
  const receipts = h.receipts.filter((r) => r.section === section)
  const total = receipts.reduce((s, r) => s + calcReceipt(r, friends).total, 0)

  return (
    <>
      <div className="section-head">
        <h2>{sec.label}</h2>
        {total > 0 && <Money value={total} className="section-total" />}
      </div>

      {h.people.length === 0 ? (
        <>
          <Empty emoji="👋" title={t.whosComing} text={t.addPeopleFirst} />
          <Press className="btn primary wide" onClick={onNeedPeople}>
            {t.addPeople}
          </Press>
        </>
      ) : receipts.length === 0 ? (
        <Empty emoji={EMPTY_EMOJI[section]} title={sec.empty[0]} text={sec.empty[1]} />
      ) : (
        <div className="list">
          {/* cards already there when the tab opens don't animate, new ones do */}
          <AnimatePresence initial={false}>
            {receipts.map((r) => (
              <ReceiptCard key={r.id} r={r} friends={friends} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  )
}

/** lives outside the animated tab content so it never moves during a tab switch */
export function SectionAdd({ hangout: h, section }: { hangout: Hangout; section: SectionKey }) {
  const t = useT()
  const sec = t.sections[section]
  const [quick, setQuick] = useState(false)
  return (
    <>
      <m.div
        className="fab-row"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={snappy}
      >
        <Press className="btn primary float" onClick={() => setQuick(true)}>
          <IconPlus />
          <m.span key={section} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            {sec.add}
          </m.span>
        </Press>
      </m.div>
      <Sheet open={quick} onClose={() => setQuick(false)} title={sec.title}>
        {quick && <QuickForm hangout={h} section={section} onClose={() => setQuick(false)} />}
      </Sheet>
    </>
  )
}

function ReceiptCard({ r, friends }: { r: Receipt; friends: Record<string, Person> }) {
  const t = useT()
  const c = calcReceipt(r, friends)
  const payer = r.payerId ? friends[r.payerId] : undefined
  const members = r.members.map((id) => friends[id]).filter(Boolean)
  const title = r.title || (r.section === 'transport' ? t.sections.transport.name : t.untitled)
  return (
    <m.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={snappy}>
      <Press className="card receipt-card" onClick={() => openReceipt(r.id)}>
        <div className="rc-top">
          <span className="rc-title">{title}</span>
          <span className="rc-total num">{tenge(c.total)}</span>
        </div>
        <div className="rc-meta">
          {payer ? (
            <span className="rc-payer">
              <Avatar person={payer} size={20} /> {t.paidName(payer.name)}
            </span>
          ) : (
            <span className="warn-text">{t.whoPaid}</span>
          )}
          {r.section === 'dining' && <span>· {t.nItems(r.items.length)}</span>}
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
  const t = useT()
  const sec = t.sections[section]
  const people = h.people.map((id) => friends[id]).filter(Boolean)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [payer, setPayer] = useState(h.people[0])
  const [members, setMembers] = useState(h.people)
  // only Dining is itemized, and there a single total is the opt-in
  const [whole, setWhole] = useState(section !== 'dining')
  const value = parseAmount(amount)

  const create = () => {
    const name = title.trim() || sec.name
    const items = whole && value > 0 ? [{ id: uid(), name, price: value, qty: 1, category: categorize(name, section), to: [] }] : []
    const id = useStore.getState().addReceipt(h.id, {
      section,
      title: section === 'transport' ? '' : name,
      payerId: payer,
      members,
      items,
    })
    onClose()
    if (!whole) openReceipt(id)
  }

  return (
    <div className="form">
      {section !== 'transport' && (
        <input className="field" placeholder={sec.placeholder} value={title} onChange={(e) => setTitle(e.target.value)} />
      )}
      {section === 'dining' && <Switch label={t.wholeReceipt} on={whole} onChange={setWhole} />}
      {whole && (
        <label className="amount-field">
          <input
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,\s]/g, ''))}
          />
          <span>₸</span>
        </label>
      )}
      <label className="label">{t.paidBy}</label>
      <PeoplePicker people={people} selected={[payer]} onToggle={setPayer} />
      <label className="label">{section === 'transport' ? t.whoRode : t.splitBetween}</label>
      <PeoplePicker
        people={people}
        selected={members}
        onToggle={(id) => setMembers((ms) => (ms.includes(id) ? ms.filter((x) => x !== id) : [...ms, id]))}
      />
      <Press className="btn primary wide" disabled={(whole && !(value > 0)) || !members.length} onClick={create}>
        {!whole ? t.addItems : value > 0 ? t.addAmount(tenge(value)) : t.add}
      </Press>
    </div>
  )
}
