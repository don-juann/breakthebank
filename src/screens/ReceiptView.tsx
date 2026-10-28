import { useEffect, useRef, useState } from 'react'
import { useAnimate } from 'motion/react'
import * as m from 'motion/react-m'
import { useStore } from '../store'
import { back } from '../nav'
import { calcReceipt } from '../lib/split'
import { categorize } from '../lib/categorize'
import { parseAmount, tenge } from '../lib/money'
import { CATEGORIES, SECTIONS, type Category, type Hangout, type Item, type Person, type Receipt } from '../types'
import { Press } from '../ui/Press'
import { Sheet } from '../ui/Sheet'
import { Avatar, AvatarStack, Empty, Money, PeoplePicker, Stepper } from '../ui/bits'
import { DragLayer, useDraggable, useDropTarget } from '../ui/dnd'
import { IconBack, IconCamera, IconPeople, IconPlus, IconTrash } from '../ui/icons'
import { jelly } from '../ui/motion'
import { useScan } from './Scan'

const ORDER: Category[] = ['food', 'drinks', 'dessert', 'other']
const PICKABLE: Category[] = ['food', 'drinks', 'dessert']

export function ReceiptView({ hangout: h, receipt: r }: { hangout: Hangout; receipt: Receipt }) {
  const friends = useStore((s) => s.friends)
  const st = useStore.getState()
  const [itemId, setItemId] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const people = h.people.map((id) => friends[id]).filter(Boolean)
  const members = people.filter((p) => r.members.includes(p.id))
  const payer = r.payerId ? friends[r.payerId] : undefined
  const c = calcReceipt(r, friends)
  const update = (patch: Partial<Receipt>) => st.updateReceipt(h.id, r.id, patch)
  const scan = useScan(r.section, (res) => {
    st.addItems(h.id, r.id, res.items)
    if (!r.title && res.title) update({ title: res.title })
    if (!r.service && res.service) update({ service: res.service })
  })
  const groups = ORDER.map((cat) => ({ cat, items: r.items.filter((it) => it.category === cat) })).filter((g) => g.items.length)

  return (
    <DragLayer onDrop={(ids, target) => st.assign(h.id, r.id, ids, target)}>
      <div className="scroll with-dock">
        <div className="nav-row">
          <Press round className="icon-btn" onClick={back} aria-label="Back">
            <IconBack />
          </Press>
          <span className="nav-title">
            {SECTIONS[r.section].emoji} {SECTIONS[r.section].label}
          </span>
          <Press round className="icon-btn danger" onClick={() => setConfirmDel(true)} aria-label="Delete receipt">
            <IconTrash />
          </Press>
        </div>
        <input
          className="title-input"
          placeholder="Name this receipt"
          value={r.title}
          onChange={(e) => update({ title: e.target.value })}
        />

        <div className="card pad">
          <div className="label">Paid by</div>
          <PeoplePicker
            people={people}
            selected={r.payerId ? [r.payerId] : []}
            onToggle={(id) => update({ payerId: id, cashback: friends[id]?.cashback ?? 0 })}
          />
          <div className="label">Who's in</div>
          <PeoplePicker people={people} selected={r.members} onToggle={(id) => st.toggleMember(h.id, r.id, id)} />
        </div>

        <div className="card pad">
          <div className="fee-row">
            <div>
              <div className="fee-name">Service</div>
              <div className="fee-sub">{tenge(c.service)}</div>
            </div>
            <Stepper value={r.service} onChange={(v) => update({ service: v })} />
          </div>
          <div className="fee-row">
            <div>
              <div className="fee-name">Cashback</div>
              <div className="fee-sub">{payer ? `${payer.name}'s card, shared by everyone` : 'Shared by everyone'}</div>
            </div>
            <Stepper
              value={r.cashback}
              step={0.5}
              max={30}
              onChange={(v) => {
                update({ cashback: v })
                // remembered as the default for this person's next receipt
                if (payer) st.updateFriend(payer.id, { cashback: v })
              }}
            />
          </div>
          <div className="sum-row">
            <span>Subtotal</span>
            <span className="num">{tenge(c.subtotal)}</span>
          </div>
          <div className="sum-row total">
            <span>Total</span>
            <Money value={c.total} />
          </div>
          {c.cashback > 0 && (
            <div className="sum-row good">
              <span>Cashback</span>
              <Money value={-c.cashback} />
            </div>
          )}
        </div>

        <div className="items-head">
          <h3>Items</h3>
          {r.items.length > 0 && <span className="hint">Hold, then drag onto a person</span>}
        </div>
        {r.items.length === 0 ? (
          <Empty
            emoji="🛒"
            title="No items yet"
            text={r.section === 'dining' ? 'Add them one by one or scan the receipt.' : 'Add them one by one.'}
          />
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
            <IconPlus /> Add item
          </Press>
          {r.section === 'dining' && (
            <Press className="btn secondary" onClick={scan.pick}>
              <IconCamera /> Scan
            </Press>
          )}
        </div>
      </div>

      <div className="dock">
        <Bubble id="all" label="Everyone" />
        {members.map((p) => (
          <Bubble key={p.id} id={p.id} person={p} amount={c.shares[p.id] ?? 0} />
        ))}
      </div>

      <Sheet open={itemId !== null} onClose={() => setItemId(null)} title={itemId === 'new' ? 'New item' : 'Edit item'}>
        {itemId !== null && <ItemForm key={itemId} itemId={itemId} hangout={h} receipt={r} onClose={() => setItemId(null)} />}
      </Sheet>
      <Sheet open={confirmDel} onClose={() => setConfirmDel(false)} title="Delete this receipt?">
        <p className="muted">
          {r.items.length} item{r.items.length === 1 ? '' : 's'} will be removed from the split.
        </p>
        <Press
          className="btn danger wide"
          onClick={() => {
            setConfirmDel(false)
            st.deleteReceipt(h.id, r.id)
            back()
          }}
        >
          Delete
        </Press>
      </Sheet>
      {scan.ui}
    </DragLayer>
  )
}

function ItemChip({ item: it, friends, onTap }: { item: Item; friends: Record<string, Person>; onTap: () => void }) {
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
        <div className="item-name">{it.name}</div>
        {it.qty !== 1 && (
          <div className="item-sub">
            {it.qty} × {tenge(it.price)}
          </div>
        )}
      </div>
      <div className="item-side">
        <span className="item-amt num">{tenge(it.qty * it.price)}</span>
        {who.length ? <AvatarStack people={who} size={20} /> : <span className="tag">Everyone</span>}
      </div>
    </m.div>
  )
}

function GroupChip({ cat, ids }: { cat: Category; ids: string[] }) {
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
      {CATEGORIES[cat].label}
      <span className="count">{ids.length}</span>
    </m.div>
  )
}

function Bubble({ id, person, label, amount }: { id: string; person?: Person; label?: string; amount?: number }) {
  const t = useDropTarget(id)
  const [scope, animate] = useAnimate<HTMLDivElement>()
  useEffect(() => {
    if (t.hits) animate(scope.current, { scale: [1.45, 1] }, { type: 'spring', stiffness: 480, damping: 9 })
  }, [t.hits, animate, scope])
  return (
    <m.div
      ref={t.ref}
      className={`bubble ${t.over ? 'over' : ''}`}
      animate={{ scale: t.over ? 1.18 : 1, y: t.over ? -10 : t.dragging ? -4 : 0 }}
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
      {amount != null ? <Money value={amount} className="bubble-amt" /> : <span className="bubble-amt">shared</span>}
    </m.div>
  )
}

function ItemForm({ itemId, hangout: h, receipt: r, onClose }: { itemId: string; hangout: Hangout; receipt: Receipt; onClose: () => void }) {
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
    const data = { name: name.trim() || 'Item', price: value, qty, category: cat, to }
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
        placeholder="Item name"
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
            placeholder="Price"
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
      {r.section === 'dining' && (
        <>
          <div className="label">Category</div>
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
                {CATEGORIES[k].emoji} {CATEGORIES[k].label}
              </Press>
            ))}
          </div>
        </>
      )}
      <div className="label">Who had it</div>
      <Press round className={`chip ${to.length === 0 ? 'on' : ''}`} onClick={() => setTo([])}>
        👥 Everyone, shared
      </Press>
      <PeoplePicker
        people={members}
        selected={to}
        dimUnselected={to.length > 0}
        onToggle={(id) => setTo((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]))}
      />
      {existing && Number.isInteger(existing.qty) && existing.qty > 1 && (
        <Press
          className="btn ghost wide"
          onClick={() => {
            st.splitItem(h.id, r.id, existing.id)
            onClose()
          }}
        >
          Split into {existing.qty} separate items
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
            Delete
          </Press>
        ) : (
          <Press className="btn secondary" disabled={!(value > 0)} onClick={() => save(true)}>
            Add & next
          </Press>
        )}
        <Press className="btn primary" disabled={!(value > 0)} onClick={() => save(false)}>
          {existing ? 'Save' : 'Add'}
        </Press>
      </div>
    </div>
  )
}
