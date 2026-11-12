import { useEffect, useState } from 'react'
import { AnimatePresence, useAnimate } from 'motion/react'
import * as m from 'motion/react-m'
import { useStore } from '../store'
import { back } from '../nav'
import { calcReceipt, type ReceiptCalc } from '../lib/split'
import { categorize } from '../lib/categorize'
import { fmt, tenge } from '../lib/money'
import { useT } from '../i18n'
import { CATEGORIES, SECTION_KEYS, SECTIONS, type Category, type Hangout, type Item, type Person, type Receipt, type SectionKey } from '../types'
import { Press } from '../ui/Press'
import { Sheet } from '../ui/Sheet'
import { Avatar, AvatarStack, Money, PeoplePicker, Stepper } from '../ui/bits'
import { DragLayer, useDraggable, useDropTarget } from '../ui/dnd'
import { Keypad, Typed, parseTyped, press } from '../ui/Keypad'
import { IconBack, IconClose, IconMore, IconPeople, IconPlus, IconTrash } from '../ui/icons'
import { jelly, sheetSpring } from '../ui/motion'
import { toast } from '../ui/toast'

const ORDER: Category[] = ['food', 'drinks', 'dessert', 'other']
const PICKABLE: Category[] = ['food', 'drinks', 'dessert']

interface Props {
  hangout: Hangout
  receipt: Receipt
}

export function ReceiptView(props: Props) {
  // menu lives here so its sheet survives a move that swaps the layout
  const menu = useReceiptMenu(props)
  const Layout = props.receipt.section === 'dining' ? DiningReceipt : SimpleReceipt
  return (
    <>
      <Layout {...props} onMenu={menu.open} />
      {menu.ui}
    </>
  )
}

function useReceiptMenu({ hangout: h, receipt: r }: Props) {
  const t = useT()
  const st = useStore.getState()
  const [menu, setMenu] = useState(false)
  const move = (k: SectionKey) => {
    setMenu(false)
    st.moveReceipt(h.id, r.id, k)
    toast(t.movedTo(t.sections[k].label))
  }
  const copy = (k: SectionKey) => {
    setMenu(false)
    st.copyReceipt(h.id, r.id, k)
    toast(t.copiedTo(t.sections[k].label))
  }
  const remove = () => {
    setMenu(false)
    st.deleteReceipt(h.id, r.id)
    back()
    toast(t.deleted, { label: t.undo, run: () => useStore.getState().addReceipt(h.id, r) })
  }
  const ui = (
    <Sheet open={menu} onClose={() => setMenu(false)} title={r.title || t.sections[r.section].name}>
      <div className="label">{t.moveTo}</div>
      <SectionButtons keys={SECTION_KEYS.filter((k) => k !== r.section)} onPick={move} />
      <div className="label">{t.copyTo}</div>
      <SectionButtons keys={SECTION_KEYS} onPick={copy} />
      <Press className="btn danger-ghost wide menu-delete" onClick={remove}>
        <IconTrash /> {t.delete}
      </Press>
    </Sheet>
  )
  return { open: () => setMenu(true), ui }
}

function NavRow({ section, onMenu }: { section: SectionKey; onMenu: () => void }) {
  const t = useT()
  return (
    <div className="nav-row">
      <Press round className="icon-btn" onClick={back} aria-label="Back">
        <IconBack />
      </Press>
      <span className="nav-title">
        {SECTIONS[section].emoji} {t.sections[section].label}
      </span>
      <Press round className="icon-btn" onClick={onMenu} aria-label="More">
        <IconMore />
      </Press>
    </div>
  )
}

function PayerAndMembers({ hangout: h, receipt: r }: Props) {
  const t = useT()
  const friends = useStore((s) => s.friends)
  const st = useStore.getState()
  const people = h.people.map((id) => friends[id]).filter(Boolean)
  return (
    <div className="card pad who">
      <div className="label">{t.paidBy}</div>
      <PeoplePicker
        people={people}
        size={36}
        selected={r.payerId ? [r.payerId] : []}
        onToggle={(id) => st.updateReceipt(h.id, r.id, { payerId: id, cashback: friends[id]?.cashback ?? 0 })}
      />
      <div className="label">{r.section === 'transport' ? t.whoRode : t.whosIn}</div>
      <PeoplePicker people={people} size={36} selected={r.members} onToggle={(id) => st.toggleMember(h.id, r.id, id)} />
    </div>
  )
}

/** service, cashback and the totals, written like the bottom of a bill */
function Totals({ hangout: h, receipt: r, c, service, each }: Props & { c: ReceiptCalc; service: boolean; each?: number }) {
  const t = useT()
  const friends = useStore((s) => s.friends)
  const st = useStore.getState()
  const payer = r.payerId ? friends[r.payerId] : undefined
  return (
    <div className="card pad totals">
      {service && (
        <div className="fee-row">
          <div>
            <div className="fee-name">{t.service}</div>
            <div className="fee-sub num">{tenge(c.service)}</div>
          </div>
          <Stepper value={r.service} onChange={(v) => st.updateReceipt(h.id, r.id, { service: v })} />
        </div>
      )}
      <div className="fee-row">
        <div>
          <div className="fee-name">{t.cashback}</div>
          <div className="fee-sub">{payer ? t.cardShared(payer.name) : t.sharedAll}</div>
        </div>
        <Stepper
          value={r.cashback}
          step={0.5}
          max={30}
          onChange={(v) => {
            st.updateReceipt(h.id, r.id, { cashback: v })
            // remembered as the default for this person's next receipt
            if (payer) st.updateFriend(payer.id, { cashback: v })
          }}
        />
      </div>
      {service && (
        <div className="bill-row sum">
          <span>{t.subtotal}</span>
          <span className="lead" />
          <span className="num">{fmt(c.subtotal)}</span>
        </div>
      )}
      <div className="bill-row sum total">
        <span>{t.total}</span>
        <span className="lead" />
        <Money value={c.total} />
      </div>
      {c.cashback > 0 && (
        <div className="bill-row sum good">
          <span>{t.cashback}</span>
          <span className="lead" />
          <Money value={-c.cashback} />
        </div>
      )}
      {each != null && each > 0 && (
        <div className="bill-row sum">
          <span>{t.each}</span>
          <span className="lead" />
          <Money value={each} />
        </div>
      )}
    </div>
  )
}

/** keypad pinned to the thumb zone; slides up from the bottom */
function PadDock({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <m.div className="pad-dock" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={sheetSpring}>
          {children}
        </m.div>
      )}
    </AnimatePresence>
  )
}

/** Event and Transport: one amount split between whoever was in */
function SimpleReceipt({ onMenu, ...props }: Props & { onMenu: () => void }) {
  const { hangout: h, receipt: r } = props
  const t = useT()
  const friends = useStore((s) => s.friends)
  const st = useStore.getState()
  const sec = t.sections[r.section]
  const c = calcReceipt(r, friends)
  const [typed, setTyped] = useState(c.subtotal ? String(Math.round(c.subtotal)) : '')
  const [pad, setPad] = useState(!c.subtotal)
  const members = r.members.filter((id) => friends[id])
  const key = (k: string) => {
    const next = press(typed, k)
    setTyped(next)
    st.setAmount(h.id, r.id, parseTyped(next).price, r.title || sec.name)
  }

  return (
    <>
      <div className={`scroll ${pad ? 'with-pad' : ''}`}>
        <NavRow section={r.section} onMenu={onMenu} />
        {r.section === 'event' ? (
          <input
            className="title-input"
            placeholder={sec.placeholder}
            value={r.title}
            onChange={(e) => {
              st.updateReceipt(h.id, r.id, { title: e.target.value })
              if (r.items[0]) st.updateItem(h.id, r.id, r.items[0].id, { name: e.target.value })
            }}
          />
        ) : (
          <h1 className="title-input">{r.title || sec.name}</h1>
        )}
        <button type="button" className={`amount-display ${pad ? 'on' : ''}`} onClick={() => setPad(true)}>
          <Typed value={typed} active={pad} />
        </button>

        <PayerAndMembers {...props} />
        <Totals {...props} c={c} service={r.section === 'event'} each={members.length ? (c.total - c.cashback) / members.length : 0} />
      </div>
      <PadDock open={pad}>
        <Keypad onKey={key} />
        <Press className="btn primary wide" onClick={() => setPad(false)}>
          {t.done}
        </Press>
      </PadDock>
    </>
  )
}

interface Draft {
  typed: string
  name: string
  to: string[]
}
const blank: Draft = { typed: '', name: '', to: [] }

function DiningReceipt({ onMenu, ...props }: Props & { onMenu: () => void }) {
  const { hangout: h, receipt: r } = props
  const t = useT()
  const friends = useStore((s) => s.friends)
  const st = useStore.getState()
  const [sel, setSel] = useState<string | null>(null)
  const [entry, setEntry] = useState(r.items.length === 0)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(blank)
  const [lastCat, setLastCat] = useState<Category>('food')
  const [picked, setPicked] = useState<Category | null>(null)
  const members = h.people.map((id) => friends[id]).filter((p) => p && r.members.includes(p.id))
  const c = calcReceipt(r, friends)
  const selItem = r.items.find((it) => it.id === sel)
  const lastItem = r.items.at(-1)
  const groups = ORDER.map((cat) => ({ cat, items: r.items.filter((it) => it.category === cat) })).filter((g) => g.items.length)
  // a tapped chip wins; otherwise guess from the name, or keep the last one used
  const cat = picked ?? (draft.name.trim() ? categorize(draft.name, 'dining') : lastCat)
  const { price, qty } = parseTyped(draft.typed)

  // the people strip edits whoever had the selected item, or the row being typed
  const target = selItem ? selItem.to : entry ? draft.to : null
  const toggle = (pid: string) => {
    const cur = selItem ? selItem.to : draft.to
    const next = pid === 'all' ? [] : cur.includes(pid) ? cur.filter((x) => x !== pid) : [...cur, pid]
    if (selItem) st.updateItem(h.id, r.id, selItem.id, { to: next })
    else setDraft((d) => ({ ...d, to: next }))
  }

  const commit = () => {
    if (!(price > 0)) return
    st.addItems(h.id, r.id, [{ name: draft.name.trim() || t.itemN(r.items.length + 1), price, qty, category: cat, to: draft.to }])
    setLastCat(cat)
    setPicked(null)
    setDraft(blank)
    const fresh = useStore.getState().hangouts.find((x) => x.id === h.id)?.receipts.find((x) => x.id === r.id)?.items.at(-1)
    if (fresh) requestAnimationFrame(() => document.querySelector(`[data-item="${fresh.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }

  return (
    <DragLayer onDrop={(ids, to) => st.assign(h.id, r.id, ids, to)}>
      <div className={`scroll ${entry && !selItem ? 'with-entry' : 'with-strip'}`}>
        <NavRow section={r.section} onMenu={onMenu} />
        <input
          className="title-input"
          placeholder={t.receiptName}
          value={r.title}
          onChange={(e) => st.updateReceipt(h.id, r.id, { title: e.target.value })}
        />
        <PayerAndMembers {...props} />

        {groups.length > 0 && (
          <div className="bill items-bill">
            {groups.map((g) => (
              <section key={g.cat} className="bill-group">
                <GroupHead cat={g.cat} items={g.items} />
                <AnimatePresence initial={false}>
                  {g.items.map((it) => (
                    <ItemLine
                      key={it.id}
                      item={it}
                      friends={friends}
                      selected={it.id === sel}
                      onTap={() => setSel((s) => (s === it.id ? null : it.id))}
                    />
                  ))}
                </AnimatePresence>
              </section>
            ))}
          </div>
        )}

        <Totals {...props} c={c} service />
      </div>

      <div className="entry-dock">
        {selItem && <div className="dock-hint">{t.assignHint}</div>}
        <div className="strip">
          <Bubble id="all" label={t.everyone} on={target ? target.length === 0 : undefined} onTap={() => target && toggle('all')} />
          {members.map((p) => (
            <Bubble
              key={p.id}
              id={p.id}
              person={p}
              amount={c.shares[p.id] ?? 0}
              on={target?.length ? target.includes(p.id) : undefined}
              onTap={() => target && toggle(p.id)}
            />
          ))}
        </div>
        {selItem ? (
          <div className="sel-bar">
            <span className="sel-name">{selItem.name}</span>
            <span className="num sel-amt">{tenge(selItem.price * selItem.qty)}</span>
            <Press className="btn secondary small" onClick={() => setEditId(selItem.id)}>
              {t.edit}
            </Press>
            <Press round className="icon-btn" onClick={() => setSel(null)} aria-label={t.done}>
              <IconClose />
            </Press>
          </div>
        ) : entry ? (
          <div className="entry">
            {lastItem && (
              // the row that was just added, so you see it land while the bill is covered
              <m.div key={lastItem.id} className="entry-last" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={jelly}>
                <span className="bill-name">{lastItem.name}</span>
                {lastItem.qty !== 1 && <span className="bill-qty num">×{lastItem.qty}</span>}
                <span className="lead" />
                <span className="num">{fmt(lastItem.price * lastItem.qty)}</span>
              </m.div>
            )}
            <div className="entry-row">
              <input
                className="entry-name"
                placeholder={t.itemN(r.items.length + 1)}
                value={draft.name}
                enterKeyHint="done"
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
              <Typed value={draft.typed} active />
            </div>
            <div className="entry-cats">
              {PICKABLE.map((k) => (
                <button key={k} type="button" className={`mini-chip cat-${k} ${cat === k ? 'on' : ''}`} onClick={() => setPicked(k)}>
                  {CATEGORIES[k].emoji} {t.cats[k]}
                </button>
              ))}
            </div>
            <Keypad
              onKey={(k) => setDraft((d) => ({ ...d, typed: press(d.typed, k) }))}
              onHide={() => setEntry(false)}
              action={
                <Press className="key go" disabled={!(price > 0)} onClick={commit}>
                  {t.next}
                </Press>
              }
            />
          </div>
        ) : (
          <Press className="btn primary wide" onClick={() => setEntry(true)}>
            <IconPlus /> {t.addItem}
          </Press>
        )}
      </div>

      <Sheet open={editId !== null} onClose={() => setEditId(null)} title={t.editItem}>
        {editId !== null && (
          <ItemForm
            key={editId}
            itemId={editId}
            hangout={h}
            receipt={r}
            onClose={() => {
              setEditId(null)
              setSel(null)
            }}
          />
        )}
      </Sheet>
    </DragLayer>
  )
}

function SectionButtons({ keys, onPick }: { keys: SectionKey[]; onPick: (k: SectionKey) => void }) {
  const t = useT()
  return (
    <div className="section-btns">
      {keys.map((k) => (
        <Press key={k} className="section-btn" onClick={() => onPick(k)}>
          <span className="section-btn-emoji">{SECTIONS[k].emoji}</span>
          {t.sections[k].label}
        </Press>
      ))}
    </div>
  )
}

/** hold to drag a whole category onto someone */
function GroupHead({ cat, items }: { cat: Category; items: Item[] }) {
  const t = useT()
  const d = useDraggable(`group-${cat}`, items.map((it) => it.id))
  const sum = items.reduce((s, it) => s + it.price * it.qty, 0)
  return (
    <div className={`bill-head cat-${cat} ${d.lifted ? 'lifted' : ''}`} onPointerDown={d.onPointerDown} onContextMenu={d.onContextMenu}>
      <span className="cat-dot" />
      <span className="bill-head-name">{t.cats[cat]}</span>
      <span className="lead" />
      <span className="bill-head-amt num">{fmt(sum)}</span>
    </div>
  )
}

/** tap to pick who had it; hold to drag it onto someone */
function ItemLine({ item: it, friends, selected, onTap }: { item: Item; friends: Record<string, Person>; selected: boolean; onTap: () => void }) {
  const t = useT()
  const d = useDraggable(it.id, [it.id], onTap)
  const who = it.to.map((id) => friends[id]).filter(Boolean)
  return (
    <m.div
      className="bill-line-wrap"
      data-item={it.id}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: d.lifted ? 0.3 : 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={jelly}
    >
      <div className={`bill-line item-line ${selected ? 'selected' : ''}`} onPointerDown={d.onPointerDown} onContextMenu={d.onContextMenu}>
        <span className="bill-row">
          <span className="bill-name">{it.name || t.item}</span>
          {it.qty !== 1 && <span className="bill-qty num">×{it.qty}</span>}
          <span className="lead" />
          <span className="bill-amt num">{fmt(it.qty * it.price)}</span>
        </span>
        <span className="bill-sub">
          {who.length ? <AvatarStack people={who} size={16} /> : <span className="tag">{t.everyone}</span>}
        </span>
      </div>
    </m.div>
  )
}

function Bubble({
  id,
  person,
  label,
  amount,
  on,
  onTap,
}: {
  id: string
  person?: Person
  label?: string
  amount?: number
  on?: boolean
  onTap: () => void
}) {
  const t = useT()
  const target = useDropTarget(id)
  const [scope, animate] = useAnimate<HTMLDivElement>()
  useEffect(() => {
    if (target.hits) animate(scope.current, { scale: [1.45, 1] }, { type: 'spring', stiffness: 480, damping: 9 })
  }, [target.hits, animate, scope])
  return (
    <m.button
      type="button"
      ref={target.ref}
      className={`bubble ${target.over ? 'over' : ''} ${on ? 'on' : on === false ? 'off' : ''}`}
      onClick={onTap}
      animate={{ scale: target.over ? 1.18 : 1, y: target.over ? -10 : target.dragging ? -4 : 0 }}
      whileTap={{ scale: 0.9 }}
      transition={jelly}
    >
      <div ref={scope} className="bubble-ava">
        {person ? (
          <Avatar person={person} size={44} />
        ) : (
          <span className="all-ava">
            <IconPeople />
          </span>
        )}
      </div>
      <div className="bubble-name">{person?.name ?? label}</div>
      {amount != null ? <Money value={amount} className="bubble-amt" /> : <span className="bubble-amt">{t.shared}</span>}
    </m.button>
  )
}

function ItemForm({ itemId, hangout: h, receipt: r, onClose }: { itemId: string; hangout: Hangout; receipt: Receipt; onClose: () => void }) {
  const t = useT()
  const st = useStore.getState()
  const it = r.items.find((x) => x.id === itemId)
  const [name, setName] = useState(it?.name ?? '')
  const [typed, setTyped] = useState(it ? `${Math.round(it.price)}${it.qty !== 1 ? `×${it.qty}` : ''}` : '')
  const [cat, setCat] = useState<Category>(it?.category ?? 'food')
  if (!it) return null
  const { price, qty } = parseTyped(typed)

  const save = () => {
    if (!(price > 0)) return
    st.updateItem(h.id, r.id, it.id, { name: name.trim() || it.name, price, qty, category: cat })
    onClose()
  }
  const remove = () => {
    st.deleteItem(h.id, r.id, it.id)
    onClose()
    toast(t.deleted, { label: t.undo, run: () => useStore.getState().addItems(h.id, r.id, [it]) })
  }

  return (
    <div className="form">
      <input className="field" placeholder={t.itemName} value={name} onChange={(e) => setName(e.target.value)} />
      <div className="add-amount">
        <Typed value={typed} active />
      </div>
      <div className="entry-cats">
        {PICKABLE.map((k) => (
          <button key={k} type="button" className={`mini-chip cat-${k} ${cat === k ? 'on' : ''}`} onClick={() => setCat(k)}>
            {CATEGORIES[k].emoji} {t.cats[k]}
          </button>
        ))}
      </div>
      <Keypad
        onKey={(k) => setTyped((s) => press(s, k))}
        onHide={onClose}
        action={
          <Press className="key go" disabled={!(price > 0)} onClick={save}>
            {t.save}
          </Press>
        }
      />
      {Number.isInteger(it.qty) && it.qty > 1 && (
        <Press
          className="btn ghost wide"
          onClick={() => {
            st.splitItem(h.id, r.id, it.id)
            onClose()
          }}
        >
          {t.splitInto(it.qty)}
        </Press>
      )}
      <Press className="btn danger-ghost wide" onClick={remove}>
        <IconTrash /> {t.delete}
      </Press>
    </div>
  )
}
