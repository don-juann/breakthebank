import { useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useStore } from '../store'
import { back, openReceipt } from '../nav'
import { useT } from '../i18n'
import { calcReceipt, settle } from '../lib/split'
import { fmt } from '../lib/money'
import { SECTION_KEYS, type Hangout, type Person, type Receipt, type SectionKey } from '../types'
import { Press } from '../ui/Press'
import { AddTile, Avatar, AvatarStack, Empty, Money, copyText } from '../ui/bits'
import { Sheet } from '../ui/Sheet'
import { IconBack, IconCopy, IconDining, IconEvent, IconLink, IconMore, IconPlus, IconShare, IconTransport } from '../ui/icons'
import { snappy } from '../ui/motion'
import { toast } from '../ui/toast'
import { shareHangout, shareLink } from '../sync'
import { PeopleSheet, PersonSheet } from './People'
import { AddSheet } from './AddSheet'
import { SettleSheet } from './SettleView'

const KIND_ICON = { event: IconEvent, dining: IconDining, transport: IconTransport }
// longer groups start folded so the bill stays short
const FOLD = 5

const pad = (n: number) => String(n).padStart(2, '0')
const isoDay = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function HangoutView({ hangout: h }: { hangout: Hangout }) {
  const friends = useStore((s) => s.friends)
  const st = useStore.getState()
  const t = useT()
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const [adding, setAdding] = useState(false)
  const [settling, setSettling] = useState(false)
  const people = h.people.map((id) => friends[id]).filter(Boolean)

  return (
    <>
      <div className="scroll bill-scroll">
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
          {h.shareId && <span className="live-dot" aria-label="Shared" />}
        </div>

        <div className="picker people-row">
          {people.map((p) => (
            <Press key={p.id} round className="pick" onClick={() => setEditing(p.id)}>
              <span className="pick-ava">
                <Avatar person={p} size={40} />
              </span>
              <span className="pick-name">{p.name}</span>
            </Press>
          ))}
          <AddTile label={t.add} size={40} onClick={() => setPeopleOpen(true)} />
        </div>

        <Ledger hangout={h} friends={friends} />
      </div>

      <Dock hangout={h} friends={friends} onAdd={() => (h.people.length ? setAdding(true) : setPeopleOpen(true))} onSettle={() => setSettling(true)} />

      <AddSheet hangout={h} open={adding} onClose={() => setAdding(false)} />
      <SettleSheet hangout={h} open={settling} onClose={() => setSettling(false)} />
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

/** the whole hangout as one bill: a group per kind, a line per expense */
function Ledger({ hangout: h, friends }: { hangout: Hangout; friends: Record<string, Person> }) {
  const t = useT()
  const groups = SECTION_KEYS.map((k) => ({ k, receipts: h.receipts.filter((r) => r.section === k) })).filter((g) => g.receipts.length)
  if (!groups.length) return <Empty emoji="🧾" title={t.noExpenses} text={h.people.length ? t.addFirstHint : t.addPeopleFirst} />
  return (
    <div className="bill">
      {groups.map((g) => (
        <Group key={g.k} section={g.k} receipts={g.receipts} friends={friends} crew={h.people.length} />
      ))}
    </div>
  )
}

function Group({
  section,
  receipts,
  friends,
  crew,
}: {
  section: SectionKey
  receipts: Receipt[]
  friends: Record<string, Person>
  crew: number
}) {
  const t = useT()
  const [open, setOpen] = useState(receipts.length <= FOLD)
  const total = receipts.reduce((s, r) => s + calcReceipt(r, friends).total, 0)
  const shown = open ? receipts : receipts.slice(-3)
  const Icon = KIND_ICON[section]
  return (
    <section className="bill-group">
      <button type="button" className="bill-head" onClick={() => setOpen(!open)}>
        <Icon />
        <span className="bill-head-name">{t.sections[section].label}</span>
        <span className="lead" />
        <Money value={total} className="bill-head-amt" />
      </button>
      <AnimatePresence initial={false}>
        {shown.map((r) => (
          <Line key={r.id} r={r} friends={friends} crew={crew} />
        ))}
      </AnimatePresence>
      {!open && (
        <button type="button" className="bill-more" onClick={() => setOpen(true)}>
          {t.showAll(receipts.length)}
        </button>
      )}
    </section>
  )
}

function Line({ r, friends, crew }: { r: Receipt; friends: Record<string, Person>; crew: number }) {
  const t = useT()
  const c = calcReceipt(r, friends)
  const payer = r.payerId ? friends[r.payerId] : undefined
  const members = r.members.map((id) => friends[id]).filter(Boolean)
  const title = r.title || (r.section === 'transport' ? t.sections.transport.name : t.untitled)
  return (
    <m.div
      className="bill-line-wrap"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={snappy}
    >
      <Press className="bill-line" onClick={() => openReceipt(r.id)}>
        <span className="bill-row">
          <span className="bill-name">{title}</span>
          <span className="lead" />
          <span className="bill-amt num">{fmt(c.total)}</span>
        </span>
        <span className="bill-sub">
          {payer ? (
            <span className="bill-payer">
              <Avatar person={payer} size={16} /> {t.paidName(payer.name)}
            </span>
          ) : (
            <span className="warn-text">{t.whoPaid}</span>
          )}
          {r.section === 'dining' && r.items.length > 0 && <span>· {t.nItems(r.items.length)}</span>}
          {c.rate > 0 && <span className="badge good">−{Math.round(c.rate * 1000) / 10}%</span>}
          {r.service > 0 && <span className="badge">+{r.service}%</span>}
          {/* everyone is the default; only call out who was in when it's fewer */}
          {members.length < crew && (
            <span className="bill-who">
              <AvatarStack people={members} size={18} />
            </span>
          )}
        </span>
      </Press>
    </m.div>
  )
}

/** thumb zone: the total, who pays whom, and the one add button */
function Dock({
  hangout: h,
  friends,
  onAdd,
  onSettle,
}: {
  hangout: Hangout
  friends: Record<string, Person>
  onAdd: () => void
  onSettle: () => void
}) {
  const t = useT()
  const s = useMemo(() => settle(h, friends), [h, friends])
  const [first, ...rest] = s.transfers
  const name = (id: string) => friends[id]?.name ?? '?'
  return (
    <div className="bill-dock">
      <Press className="peek" onClick={onSettle} aria-label={t.settleUp}>
        <span className="peek-top">
          <span className="peek-label">{t.total}</span>
          <Money value={s.total} className="peek-total" />
        </span>
        <span className="peek-line">
          {first ? (
            <>
              <span className="peek-name">{name(first.from)}</span>
              <span className="peek-arrow">→</span>
              <b className="num">{fmt(first.amount)}</b>
              <span className="peek-arrow">→</span>
              <span className="peek-name">{name(first.to)}</span>
              {rest.length > 0 && <span className="peek-more">{t.more(rest.length)}</span>}
            </>
          ) : s.total > 0 ? (
            t.noDebts
          ) : (
            t.noExpenses
          )}
        </span>
      </Press>
      <Press round className="add-btn" onClick={onAdd} aria-label={t.add}>
        <IconPlus />
      </Press>
    </div>
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
