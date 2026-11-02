import { useEffect, useRef, useState } from 'react'
import { useAnimate } from 'motion/react'
import * as m from 'motion/react-m'
import { useStore } from '../store'
import { back } from '../nav'
import { calcReceipt, type ReceiptCalc } from '../lib/split'
import { categorize } from '../lib/categorize'
import { parseAmount, tenge } from '../lib/money'
import { useT } from '../i18n'
import { CATEGORIES, SECTION_KEYS, SECTIONS, type Category, type Hangout, type Item, type Person, type Receipt, type SectionKey } from '../types'
import { Press } from '../ui/Press'
import { Sheet } from '../ui/Sheet'
import { Avatar, AvatarStack, Empty, Money, PeoplePicker, Stepper } from '../ui/bits'
import { DragLayer, useDraggable, useDropTarget } from '../ui/dnd'
import { IconBack, IconMore, IconPeople, IconPlus, IconTrash } from '../ui/icons'
import { jelly } from '../ui/motion'
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
  const [confirmDel, setConfirmDel] = useState(false)
  const move = (k: SectionKey) => {
    setMenu(false)
    st.moveReceipt(h.id, r.id, k)
    st.go({ tab: k })
    toast(t.movedTo(t.sections[k].label))
  }
  const copy = (k: SectionKey) => {
    setMenu(false)
    st.copyReceipt(h.id, r.id, k)
    toast(t.copiedTo(t.sections[k].label))
  }
  const ui = (
    <>
      <Sheet open={menu} onClose={() => setMenu(false)} title={r.title || t.sections[r.section].name}>
        <div className="label">{t.moveTo}</div>
        <SectionButtons keys={SECTION_KEYS.filter((k) => k !== r.section)} onPick={move} />
        <div className="label">{t.copyTo}</div>
        <SectionButtons keys={SECTION_KEYS} onPick={copy} />
        <Press
          className="btn danger-ghost wide menu-delete"
          onClick={() => {
            setMenu(false)
            setConfirmDel(true)
          }}
        >
          <IconTrash /> {t.delete}
        </Press>
      </Sheet>
      <Sheet open={confirmDel} onClose={() => setConfirmDel(false)} title={t.deleteQ}>
        <p className="muted">{r.section === 'dining' ? t.removesItems(r.items.length) : t.removes}</p>
        <Press
          className="btn danger wide"
          onClick={() => {
            setConfirmDel(false)
            st.deleteReceipt(h.id, r.id)
            back()
          }}
        >
          {t.delete}
        </Press>
      </Sheet>
    </>
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
    <div className="card pad">
      <div className="label">{t.paidBy}</div>
      <PeoplePicker
        people={people}
        selected={r.payerId ? [r.payerId] : []}
        onToggle={(id) => st.updateReceipt(h.id, r.id, { payerId: id, cashback: friends[id]?.cashback ?? 0 })}
      />
      <div className="label">{r.section === 'transport' ? t.whoRode : t.whosIn}</div>
      <PeoplePicker people={people} selected={r.members} onToggle={(id) => st.toggleMember(h.id, r.id, id)} />
    </div>
  )
}

function FeeRows({ hangout: h, receipt: r, c, service }: Props & { c: ReceiptCalc; service: boolean }) {
  const t = useT()
  const friends = useStore((s) => s.friends)
  const st = useStore.getState()
  const payer = r.payerId ? friends[r.payerId] : undefined
  return (
    <>
      {service && (
        <div className="fee-row">
          <div>
            <div className="fee-name">{t.service}</div>
            <div className="fee-sub">{tenge(c.service)}</div>
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
    </>
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
  const [amount, setAmount] = useState(c.subtotal ? String(Math.round(c.subtotal * 100) / 100) : '')
  const members = r.members.filter((id) => friends[id])
  const each = members.length ? (c.total - c.cashback) / members.length : 0

  return (
    <div className="scroll">
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
      <label className="amount-field receipt-amount">
        <input
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d.,\s]/g, '')
            setAmount(v)
            st.setAmount(h.id, r.id, parseAmount(v) || 0, r.title || sec.name)
          }}
        />
        <span>₸</span>
      </label>

      <PayerAndMembers {...props} />

      <div className="card pad">
        <FeeRows {...props} c={c} service={r.section === 'event'} />
        <div className="sum-row total">
          <span>{t.total}</span>
          <Money value={c.total} />
        </div>
        {c.cashback > 0 && (
          <div className="sum-row good">
            <span>{t.cashback}</span>
            <Money value={-c.cashback} />
          </div>
        )}
        {each > 0 && (
          <div className="sum-row">
            <span>{t.each}</span>
            <Money value={each} />
          </div>
        )}
      </div>
    </div>
  )
}

function DiningReceipt({ onMenu, ...props }: Props & { onMenu: () => void }) {
  const { hangout: h, receipt: r } = props
  const t = useT()
  const friends = useStore((s) => s.friends)
  const st = useStore.getState()
  const [itemId, setItemId] = useState<string | null>(null)
  const members = h.people.map((id) => friends[id]).filter((p) => p && r.members.includes(p.id))
  const c = calcReceipt(r, friends)
  const groups = ORDER.map((cat) => ({ cat, items: r.items.filter((it) => it.category === cat) })).filter((g) => g.items.length)

  return (
    <DragLayer onDrop={(ids, target) => st.assign(h.id, r.id, ids, target)}>
      <div className="scroll with-dock">
        <NavRow section={r.section} onMenu={onMenu} />
        <input
          className="title-input"
          placeholder={t.receiptName}
          value={r.title}
          onChange={(e) => st.updateReceipt(h.id, r.id, { title: e.target.value })}
        />

        <PayerAndMembers {...props} />

        <div className="card pad">
          <FeeRows {...props} c={c} service />
          <div className="sum-row">
            <span>{t.subtotal}</span>
            <span className="num">{tenge(c.subtotal)}</span>
          </div>
          <div className="sum-row total">
            <span>{t.total}</span>
            <Money value={c.total} />
          </div>
          {c.cashback > 0 && (
            <div className="sum-row good">
              <span>{t.cashback}</span>
              <Money value={-c.cashback} />
            </div>
          )}
        </div>

        <div className="items-head">
          <h3>{t.items}</h3>
          {r.items.length > 0 && <span className="hint">{t.dragHint}</span>}
        </div>
        {r.items.length === 0 ? (
          <Empty emoji="🛒" title={t.noItems} text={t.oneByOne} />
        ) : (
          groups.map((g) => (
            <div key={g.cat} className="group">
              <GroupChip cat={g.cat} ids={g.items.map((it) => it.id)} />
              <div className="items">
                {g.items.map((it) => (
                  <ItemChip key={it.id} item={it} friends={friends} onTap={() => setItemId(it.id)} />
                ))}
              </div>
            </div>
          ))
        )}
        <div className="row-btns">
          <Press className="btn secondary" onClick={() => setItemId('new')}>
            <IconPlus /> {t.addItem}
          </Press>
        </div>
      </div>

      <div className="dock">
        <Bubble id="all" label={t.everyone} />
        {members.map((p) => (
          <Bubble key={p.id} id={p.id} person={p} amount={c.shares[p.id] ?? 0} />
        ))}
      </div>

      <Sheet open={itemId !== null} onClose={() => setItemId(null)} title={itemId === 'new' ? t.newItem : t.editItem}>
        {itemId !== null && <ItemForm key={itemId} itemId={itemId} hangout={h} receipt={r} onClose={() => setItemId(null)} />}
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

function ItemChip({ item: it, friends, onTap }: { item: Item; friends: Record<string, Person>; onTap: () => void }) {
  const t = useT()
  const d = useDraggable(it.id, [it.id], onTap)
  const who = it.to.map((id) => friends[id]).filter(Boolean)
  return (
    <m.div
      layout="position"
      className={`item cat-${it.category}`}
      onPointerDown={d.onPointerDown}
      onContextMenu={d.onContextMenu}
      animate={{ opacity: d.lifted ? 0.28 : 1, scale: d.lifted ? 0.95 : 1 }}
      whileTap={{ scale: 0.97 }}
      transition={jelly}
    >
      <span className="item-dot" />
      <div className="item-main">
        <div className="item-name">{it.name || t.item}</div>
        {it.qty !== 1 && (
          <div className="item-sub">
            {it.qty} × {tenge(it.price)}
          </div>
        )}
      </div>
      <div className="item-side">
        <span className="item-amt num">{tenge(it.qty * it.price)}</span>
        {who.length ? <AvatarStack people={who} size={20} /> : <span className="tag">{t.everyone}</span>}
      </div>
    </m.div>
  )
}

function GroupChip({ cat, ids }: { cat: Category; ids: string[] }) {
  const t = useT()
  const d = useDraggable(`group-${cat}`, ids)
  return (
    <m.div
      className={`group-chip cat-${cat}`}
      onPointerDown={d.onPointerDown}
      onContextMenu={d.onContextMenu}
      animate={{ opacity: d.lifted ? 0.3 : 1 }}
      whileTap={{ scale: 0.93 }}
      transition={jelly}
    >
      <span>{CATEGORIES[cat].emoji}</span>
      {t.cats[cat]}
      <span className="count">{ids.length}</span>
    </m.div>
  )
}

function Bubble({ id, person, label, amount }: { id: string; person?: Person; label?: string; amount?: number }) {
  const t = useT()
  const target = useDropTarget(id)
  const [scope, animate] = useAnimate<HTMLDivElement>()
  useEffect(() => {
    if (target.hits) animate(scope.current, { scale: [1.45, 1] }, { type: 'spring', stiffness: 480, damping: 9 })
  }, [target.hits, animate, scope])
  return (
    <m.div
      ref={target.ref}
      className={`bubble ${target.over ? 'over' : ''}`}
      animate={{ scale: target.over ? 1.18 : 1, y: target.over ? -10 : target.dragging ? -4 : 0 }}
      transition={jelly}
    >
      <div ref={scope} className="bubble-ava">
        {person ? (
          <Avatar person={person} size={48} />
        ) : (
          <span className="all-ava">
            <IconPeople />
          </span>
        )}
      </div>
      <div className="bubble-name">{person?.name ?? label}</div>
      {amount != null ? <Money value={amount} className="bubble-amt" /> : <span className="bubble-amt">{t.shared}</span>}
    </m.div>
  )
}

function ItemForm({ itemId, hangout: h, receipt: r, onClose }: { itemId: string; hangout: Hangout; receipt: Receipt; onClose: () => void }) {
  const t = useT()
  const friends = useStore((s) => s.friends)
  const existing = r.items.find((it) => it.id === itemId)
  const nameRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(existing?.name ?? '')
  const [price, setPrice] = useState(existing ? String(Math.round(existing.price * 100) / 100) : '')
  const [qty, setQty] = useState(existing?.qty ?? 1)
  const [cat, setCat] = useState<Category>(existing?.category ?? categorize('', r.section))
  const [catTouched, setCatTouched] = useState(!!existing)
  const [to, setTo] = useState<string[]>(existing?.to ?? [])
  const members = r.members.map((id) => friends[id]).filter(Boolean)
  const value = parseAmount(price)
  const st = useStore.getState()

  const save = (again: boolean) => {
    if (!(value > 0)) return
    const data = { name: name.trim() || t.item, price: value, qty, category: cat, to }
    if (existing) st.updateItem(h.id, r.id, existing.id, data)
    else st.addItems(h.id, r.id, [data])
    if (!again) return onClose()
    setName('')
    setPrice('')
    setQty(1)
    setTo([])
    setCatTouched(false)
    nameRef.current?.focus()
  }

  return (
    <div className="form">
      <input
        ref={nameRef}
        className="field big"
        placeholder={t.itemName}
        value={name}
        autoFocus={!existing}
        onChange={(e) => {
          setName(e.target.value)
          if (!catTouched) setCat(categorize(e.target.value, r.section))
        }}
      />
      <div className="two-col">
        <label className="amount-field compact">
          <input
            inputMode="decimal"
            placeholder={t.price}
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.,\s]/g, ''))}
          />
          <span>₸</span>
        </label>
        <Stepper value={qty} onChange={setQty} min={1} max={99} suffix="×" />
      </div>
      {qty > 1 && value > 0 && (
        <div className="muted small">
          {qty} × {tenge(value)} = {tenge(qty * value)}
        </div>
      )}
      <div className="label">{t.category}</div>
      <div className="chips">
        {PICKABLE.map((k) => (
          <Press
            key={k}
            round
            className={`chip cat-${k} ${cat === k ? 'on' : ''}`}
            onClick={() => {
              setCat(k)
              setCatTouched(true)
            }}
          >
            {CATEGORIES[k].emoji} {t.cats[k]}
          </Press>
        ))}
      </div>
      <div className="label">{t.whoHad}</div>
      <Press round className={`chip ${to.length === 0 ? 'on' : ''}`} onClick={() => setTo([])}>
        👥 {t.everyoneShared}
      </Press>
      <PeoplePicker
        people={members}
        selected={to}
        dimUnselected={to.length > 0}
        onToggle={(id) => setTo((ts) => (ts.includes(id) ? ts.filter((x) => x !== id) : [...ts, id]))}
      />
      {existing && Number.isInteger(existing.qty) && existing.qty > 1 && (
        <Press
          className="btn ghost wide"
          onClick={() => {
            st.splitItem(h.id, r.id, existing.id)
            onClose()
          }}
        >
          {t.splitInto(existing.qty)}
        </Press>
      )}
      <div className="row-btns">
        {existing ? (
          <Press
            className="btn danger-ghost"
            onClick={() => {
              st.deleteItem(h.id, r.id, existing.id)
              onClose()
            }}
          >
            {t.delete}
          </Press>
        ) : (
          <Press className="btn secondary" disabled={!(value > 0)} onClick={() => save(true)}>
            {t.addNext}
          </Press>
        )}
        <Press className="btn primary" disabled={!(value > 0)} onClick={() => save(false)}>
          {existing ? t.save : t.add}
        </Press>
      </div>
    </div>
  )
}
