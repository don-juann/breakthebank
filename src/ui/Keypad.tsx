import type { ReactNode } from 'react'
import { fmt } from '../lib/money'
import { Press } from './Press'
import { IconBackspace, IconChevronDown } from './icons'

/** typed amount as text, e.g. "4500" or "4500×2" (price × qty) */
export function press(s: string, k: string): string {
  const [price, qty] = s.split('×')
  if (k === 'del') return s.slice(0, -1)
  if (k === '×') return price && qty === undefined ? s + '×' : s
  if (qty !== undefined) return k === '000' || qty.length >= 2 || (!qty && k === '0') ? s : s + k
  if (k === '000') return price && price.length <= 6 ? s + '000' : s
  if (!price && k === '0') return s
  return price.length >= 9 ? s : s + k
}

export const parseTyped = (s: string) => {
  const [price, qty] = s.split('×')
  return { price: Number(price) || 0, qty: Number(qty) || 1, hasQty: qty !== undefined }
}

export function Typed({ value, placeholder = '0', active }: { value: string; placeholder?: string; active?: boolean }) {
  const { price, hasQty } = parseTyped(value)
  const qty = value.split('×')[1]
  return (
    <span className={`typed num ${value ? '' : 'blank'}`}>
      {price ? fmt(price) : placeholder}
      {hasQty && <span className="typed-qty"> × {qty || '…'}</span>}
      {active && <span className="caret" />}
      <span className="typed-cur"> ₸</span>
    </span>
  )
}

/** 3×4 digits; with `action` it grows a 4th column (×, backspace, a tall action key) and a hide key */
export function Keypad({ onKey, action, onHide }: { onKey: (k: string) => void; action?: ReactNode; onHide?: () => void }) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0']
  return (
    <div className={`keypad ${action ? 'wide' : ''}`}>
      {digits.map((k) => (
        <Press key={k} className="key num" onClick={() => onKey(k)}>
          {k}
        </Press>
      ))}
      {action ? (
        <>
          <Press className="key fn" onClick={onHide} aria-label="Hide keypad">
            <IconChevronDown />
          </Press>
          <Press className="key fn qty" onClick={() => onKey('×')}>
            ×
          </Press>
          <Press className="key fn del" onClick={() => onKey('del')} aria-label="Delete">
            <IconBackspace />
          </Press>
          <div className="key-action">{action}</div>
        </>
      ) : (
        <Press className="key fn" onClick={() => onKey('del')} aria-label="Delete">
          <IconBackspace />
        </Press>
      )}
    </div>
  )
}
