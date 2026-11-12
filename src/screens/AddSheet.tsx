import { useState } from 'react'
import { useStore } from '../store'
import { usePrefs } from '../prefs'
import { openReceipt } from '../nav'
import { categorize } from '../lib/categorize'
import { tenge, uid } from '../lib/money'
import { useT } from '../i18n'
import { SECTION_KEYS, type Hangout, type SectionKey } from '../types'
import { Press } from '../ui/Press'
import { PeoplePicker, Segmented } from '../ui/bits'
import { Sheet } from '../ui/Sheet'
import { Keypad, Typed, parseTyped, press } from '../ui/Keypad'
import { IconDining, IconEvent, IconTransport } from '../ui/icons'
import { toast } from '../ui/toast'

const KIND_ICON = { event: IconEvent, dining: IconDining, transport: IconTransport }

export function AddSheet({ hangout, open, onClose }: { hangout: Hangout; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      {open && <AddForm hangout={hangout} onClose={onClose} />}
    </Sheet>
  )
}

function AddForm({ hangout: h, onClose }: { hangout: Hangout; onClose: () => void }) {
  const t = useT()
  const friends = useStore((s) => s.friends)
  const last = usePrefs.getState()
  const people = h.people.map((id) => friends[id]).filter(Boolean)
  const [kind, setKind] = useState<SectionKey>(last.lastKind)
  const [whole, setWhole] = useState(false)
  const [typed, setTyped] = useState('')
  const [title, setTitle] = useState('')
  const [payer, setPayer] = useState(last.lastPayer && h.people.includes(last.lastPayer) ? last.lastPayer : h.people[0])
  const [members, setMembers] = useState(h.people)
  const sec = t.sections[kind]
  const itemize = kind === 'dining' && !whole
  const { price } = parseTyped(typed)
  const ready = members.length > 0 && (itemize || price > 0)

  const create = () => {
    const st = useStore.getState()
    const name = title.trim() || sec.name
    const items = itemize ? [] : [{ id: uid(), name, price, qty: 1, category: categorize(name, kind), to: [] }]
    const id = st.addReceipt(h.id, { section: kind, title: kind === 'transport' ? '' : name, payerId: payer, members, items })
    usePrefs.getState().set({ lastKind: kind, lastPayer: payer })
    onClose()
    if (itemize) return openReceipt(id)
    const what = kind === 'transport' ? t.kinds.transport : name
    toast(t.added(`${what} · ${tenge(price)}`), { label: t.undo, run: () => useStore.getState().deleteReceipt(h.id, id) })
  }

  return (
    <div className="add">
      <Segmented
        id="kind"
        value={kind}
        onChange={setKind}
        options={SECTION_KEYS.map((k) => {
          const Icon = KIND_ICON[k]
          return {
            key: k,
            label: (
              <>
                <Icon /> {t.kinds[k]}
              </>
            ),
          }
        })}
      />
      {kind === 'dining' && (
        <Segmented
          id="mode"
          small
          value={whole ? 'whole' : 'items'}
          onChange={(v) => setWhole(v === 'whole')}
          options={[
            { key: 'items', label: t.items },
            { key: 'whole', label: t.whole },
          ]}
        />
      )}
      {kind !== 'transport' && (
        <input className="field" placeholder={sec.placeholder} value={title} onChange={(e) => setTitle(e.target.value)} />
      )}
      {!itemize && (
        <div className="add-amount">
          <Typed value={typed} active />
        </div>
      )}
      <div className="add-people">
        <div className="label">{t.paidBy}</div>
        <PeoplePicker people={people} selected={payer ? [payer] : []} onToggle={setPayer} size={38} />
        <div className="label">{kind === 'transport' ? t.whoRode : t.splitBetween}</div>
        <PeoplePicker
          people={people}
          selected={members}
          size={38}
          onToggle={(id) => setMembers((ms) => (ms.includes(id) ? ms.filter((x) => x !== id) : [...ms, id]))}
        />
      </div>
      {!itemize && <Keypad onKey={(k) => setTyped((s) => press(s, k))} />}
      <Press className="btn primary wide big" disabled={!ready} onClick={create}>
        {itemize ? t.addItems : price > 0 ? t.addAmount(tenge(price)) : t.add}
      </Press>
    </div>
  )
}
