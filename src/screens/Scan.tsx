import { useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { readReceiptText } from '../lib/ocr'
import { parseReceipt } from '../lib/parseReceipt'
import { categorize } from '../lib/categorize'
import { parseAmount, tenge, uid } from '../lib/money'
import type { Category, Item, SectionKey } from '../types'
import { Sheet } from '../ui/Sheet'
import { Press } from '../ui/Press'
import { Stepper } from '../ui/bits'
import { snappy } from '../ui/motion'

export interface ScanResult {
  title: string
  service: number
  items: Omit<Item, 'id'>[]
}

interface Row {
  key: string
  name: string
  qty: string
  total: string
  category: Category
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'reading'; progress: number; label: string }
  | { kind: 'review'; title: string; total: number | null; service: number; rows: Row[] }
  | { kind: 'error' }

const TITLES = { idle: '', reading: 'Reading receipt', review: 'Check the items', error: "Couldn't read it" }

/** photo → on-device OCR → editable review → items */
export function useScan(section: SectionKey, onDone: (r: ScanResult) => void) {
  const input = useRef<HTMLInputElement>(null)
  const run = useRef(0)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const close = () => {
    run.current++
    setPhase({ kind: 'idle' })
  }
  const pick = () => input.current?.click()

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const id = ++run.current
    setPhase({ kind: 'reading', progress: 0, label: 'Preparing photo' })
    try {
      const text = await readReceiptText(file, (progress, label) => {
        if (run.current === id) setPhase({ kind: 'reading', progress, label })
      })
      if (run.current !== id) return
      const p = parseReceipt(text, section)
      if (!p.items.length) return setPhase({ kind: 'error' })
      setPhase({
        kind: 'review',
        title: p.title,
        total: p.total,
        service: p.service ?? 0,
        rows: p.items.map((it) => ({
          key: uid(),
          name: it.name,
          qty: String(it.qty),
          total: String(Math.round(it.price * it.qty)),
          category: it.category,
        })),
      })
    } catch (err) {
      console.error(err)
      if (run.current === id) setPhase({ kind: 'error' })
    }
  }

  const confirm = (p: Extract<Phase, { kind: 'review' }>) => {
    const items = p.rows
      .map((r) => ({ name: r.name.trim(), qty: parseAmount(r.qty) || 1, total: parseAmount(r.total), category: r.category }))
      .filter((r) => r.name && r.total > 0)
      .map((r) => ({ name: r.name, qty: r.qty, price: r.total / r.qty, category: r.category, to: [] }))
    close()
    onDone({ title: p.title, service: p.service, items })
  }

  const ui = (
    <>
      <input ref={input} type="file" accept="image/*" hidden onChange={onFile} />
      <Sheet open={phase.kind !== 'idle'} onClose={close} title={TITLES[phase.kind]}>
        {phase.kind === 'reading' && <Reading progress={phase.progress} label={phase.label} />}
        {phase.kind === 'error' && (
          <div className="form">
            <p className="muted">
              No items found. Try a flat, well-lit photo where the receipt fills the frame, or type the items in by hand.
            </p>
            <Press className="btn primary wide" onClick={pick}>
              Try another photo
            </Press>
            <Press className="btn ghost wide" onClick={() => { close(); onDone({ title: '', service: 0, items: [] }) }}>
              Enter manually
            </Press>
          </div>
        )}
        {phase.kind === 'review' && <Review phase={phase} section={section} onChange={setPhase} onConfirm={confirm} />}
      </Sheet>
    </>
  )
  return { pick, ui }
}

function Reading({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="reading">
      <m.div
        className="blob"
        animate={{
          borderRadius: ['42% 58% 60% 40%', '60% 40% 38% 62%', '45% 55% 62% 38%', '42% 58% 60% 40%'],
          scale: [1, 1.06, 0.97, 1],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <m.span animate={{ y: [0, -6, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
          🧾
        </m.span>
      </m.div>
      <div className="reading-label">
        {label} · {Math.round(progress * 100)}%
      </div>
      <div className="bar">
        <m.div className="bar-fill" style={{ originX: 0 }} animate={{ scaleX: progress }} transition={snappy} />
      </div>
      <p className="muted small">Runs entirely on your phone. The first scan downloads the reader, then it's cached.</p>
    </div>
  )
}

function Review({
  phase,
  section,
  onChange,
  onConfirm,
}: {
  phase: Extract<Phase, { kind: 'review' }>
  section: SectionKey
  onChange: (p: Phase) => void
  onConfirm: (p: Extract<Phase, { kind: 'review' }>) => void
}) {
  const setRows = (rows: Row[]) => onChange({ ...phase, rows })
  const patch = (key: string, p: Partial<Row>) => setRows(phase.rows.map((r) => (r.key === key ? { ...r, ...p } : r)))
  const sum = phase.rows.reduce((s, r) => s + parseAmount(r.total), 0)
  const expected = sum * (1 + phase.service / 100)
  const diff = phase.total != null ? phase.total - expected : null
  const count = phase.rows.filter((r) => r.name.trim() && parseAmount(r.total) > 0).length

  return (
    <div className="form">
      <input
        className="field"
        placeholder="Place name"
        value={phase.title}
        onChange={(e) => onChange({ ...phase, title: e.target.value })}
      />
      <div className="rv-head">
        <span>Item</span>
        <span>Qty</span>
        <span>Sum</span>
        <span />
      </div>
      <div className="rv-list">
        <AnimatePresence initial={false}>
          {phase.rows.map((r) => (
            <m.div
              key={r.key}
              className="rv-row"
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0, x: -40 }}
              transition={snappy}
            >
              <input
                className="rv-name"
                value={r.name}
                onChange={(e) => patch(r.key, { name: e.target.value, category: categorize(e.target.value, section) })}
              />
              <input className="rv-qty" inputMode="decimal" value={r.qty} onChange={(e) => patch(r.key, { qty: e.target.value })} />
              <input className="rv-total" inputMode="decimal" value={r.total} onChange={(e) => patch(r.key, { total: e.target.value })} />
              <Press round className="rv-del" onClick={() => setRows(phase.rows.filter((x) => x.key !== r.key))} aria-label="Remove">
                ×
              </Press>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
      <button
        type="button"
        className="link"
        onClick={() => setRows([...phase.rows, { key: uid(), name: '', qty: '1', total: '', category: categorize('', section) }])}
      >
        + Add line
      </button>
      <div className="fee-row card-inset">
        <div>
          <div className="fee-name">Service</div>
          <div className="fee-sub">{tenge((sum * phase.service) / 100)}</div>
        </div>
        <Stepper value={phase.service} onChange={(v) => onChange({ ...phase, service: v })} />
      </div>
      {diff != null && (
        <div className={`check-line ${Math.abs(diff) <= 2 ? 'ok' : 'warn'}`}>
          {Math.abs(diff) <= 2
            ? `✓ Matches the receipt total of ${tenge(phase.total!)}`
            : `Receipt says ${tenge(phase.total!)}, items add up to ${tenge(expected)}. Check for missed or misread lines.`}
        </div>
      )}
      <Press className="btn primary wide" disabled={!count} onClick={() => onConfirm(phase)}>
        Add {count} item{count === 1 ? '' : 's'}
      </Press>
    </div>
  )
}
