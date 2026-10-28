import type { Category, SectionKey } from '../types'
import { categorize, stems } from './categorize'

export interface ParsedItem {
  name: string
  qty: number
  price: number
  category: Category
}

export interface ParsedReceipt {
  title: string
  items: ParsedItem[]
  total: number | null
  service: number | null
}

const TOTAL = stems('итог|всего|к\\s*оплате|оплатить|total|subtotal|amount\\s*due|сумма\\s*(?:заказа|счета|счёта|к\\s*оплате)|барлығы|жиыны|төлеуге')
const DUE = stems('к\\s*оплате|amount\\s*due|итого\\s*к|төлеуге')
const SERVICE = stems('обслуж|сервис|service|чаев|tips?$|қызмет')
const SKIP = stems(
  'ндс|nds|vat$|сдач|change$|налич|cash$|карт(?:а|ой|у)$|card$|банк$|bank$|кассир|cashier|официант|waiter|стол$|table$|гост(?:ь|ей|и)$|guests?$|дата|date$|время|time$|бин$|иин$|рнм|знм|фп$|фискал|fiscal|тел[.:]|tel[.:]|www|http|спасибо|thank|скидк|discount|наценк|стоимост|чек$|check$|счет|счёт|заказ|order$|смена|shift$|кол-?во|наименов|цена$|price$|qty$|сумма$|amount$|адрес|address|ул\\.|пр\\.|мкр|тоо$|too$|ип$|qr$|оплата|payment',
)
const DATE = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|(?<!\d)\d{1,2}:\d{2}(?!\d)|\+7|(?<!\d)8\s?\(?7\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}(?!\d)/
const FISCAL = /^(.*?)(\d+(?:[.,]\d+)?)\s*(?:шт\.?|pcs\.?|кг)?\s*[xх×*]\s*([\d\s.,]+?)(?:\s*=\s*([\d\s.,]+))?$/i
const TAIL = /^(.*?\p{L}[^\d]*?)\s+(\d[\d\s.,]*)$/u

function clean(line: string) {
  return line
    .replace(/[₸]|\b(?:kzt)\b|(?<=\d)\s*(?:тг|тнг|т)\.?(?!\p{L})/giu, ' ')
    .replace(/(?<=\d)[OoОо]+(?=[\d\s.,]|$)/g, (m) => '0'.repeat(m.length))
    .replace(/[|_~"'`]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function num(token: string, decimalFirst = false) {
  const s = token.replace(/\s/g, '')
  if (decimalFirst && /^\d+[.,]\d+$/.test(s)) return parseFloat(s.replace(',', '.'))
  if (/^\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?$/.test(s)) {
    const dec = s.match(/[.,](\d{1,2})$/)
    const int = (dec ? s.slice(0, -dec[0].length) : s).replace(/[.,]/g, '')
    return parseFloat(int + (dec ? '.' + dec[1] : ''))
  }
  if (/^\d+[.,]\d{1,2}$/.test(s)) return parseFloat(s.replace(',', '.'))
  if (/^\d+$/.test(s)) return parseInt(s, 10)
  return NaN
}

/** every way to read "1 500 3 000" with spaces as thousands separators */
function groupings(tokens: string[]) {
  const mergeAt: number[] = []
  for (let i = 1; i < tokens.length; i++) {
    if (/^\d{3}(?:[.,]\d{1,2})?$/.test(tokens[i]) && /^\d{1,3}$/.test(tokens[i - 1])) mergeAt.push(i)
  }
  const out: { g: string[]; splitTail: boolean }[] = []
  const combos = 1 << Math.min(mergeAt.length, 6)
  for (let mask = 0; mask < combos; mask++) {
    const g: string[] = []
    let splitTail = false
    tokens.forEach((t, i) => {
      const k = mergeAt.indexOf(i)
      if (k >= 0 && mask & (1 << k)) g[g.length - 1] += t
      else {
        g.push(t)
        splitTail = k >= 0
      }
    })
    out.push({ g, splitTail })
  }
  return out
}

const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(1, b * 0.01)
const money = (n: number) => n >= 50 && n <= 5_000_000

function readTail(tail: string): { qty: number; total: number; rest: string } | null {
  let best: { qty: number; total: number; rest: string; score: number } | null = null
  for (const { g, splitTail } of groupings(tail.trim().split(/\s+/))) {
    const v = g.map((t) => num(t))
    if (v.some(Number.isNaN)) continue
    const n = v.length
    const tries: { qty: number; total: number; used: number; score: number }[] = []
    const t = v[n - 1]
    if (n >= 3 && v[n - 3] > 0 && v[n - 3] <= 50 && near(v[n - 3] * v[n - 2], t)) tries.push({ qty: v[n - 3], total: t, used: 3, score: 10 })
    if (n >= 2 && near(v[n - 2], t)) tries.push({ qty: 1, total: t, used: 2, score: 7 })
    if (n >= 2 && v[n - 2] > 0 && Number.isInteger(t / v[n - 2]) && t / v[n - 2] <= 20 && money(v[n - 2])) tries.push({ qty: t / v[n - 2], total: t, used: 2, score: 7 })
    // "4 200" is far more likely 4200 than qty 4 for 200
    if (n >= 2 && Number.isInteger(v[n - 2]) && v[n - 2] >= 1 && v[n - 2] <= 20) tries.push({ qty: v[n - 2], total: t, used: 2, score: splitTail ? 1 : 5 })
    tries.push({ qty: 1, total: t, used: 1, score: 2 })
    for (const x of tries) {
      const left = g.slice(0, n - x.used)
      const score =
        x.score + (money(x.total) ? 0 : -8) - left.filter((s) => num(s) >= 10).length * 2 - (splitTail && x.used === 1 ? 3 : 0)
      if (!best || score > best.score) best = { qty: x.qty, total: x.total, rest: left.join(' '), score }
    }
  }
  return best && best.score > 0 ? best : null
}

function tidyName(s: string) {
  const n = s
    .replace(/^\s*(?:№\s*)?\d{1,3}\s*[.)]\s*/, '')
    .replace(/^[^\p{L}\d]+|[^\p{L}\d)%]+$/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  return n.charAt(0).toUpperCase() + n.slice(1)
}

const letters = (s: string) => (s.match(/\p{L}/gu) ?? []).length

function lastNumber(line: string) {
  const m = line.match(/(\d[\d\s.,]*)$/)
  if (!m) return null
  const all = groupings(m[1].trim().split(/\s+/))
  const merged = all[all.length - 1].g
  const n = num(merged[merged.length - 1])
  return Number.isNaN(n) ? null : n
}

function findTitle(lines: string[]) {
  const head = lines.slice(0, 6)
  for (const l of head) {
    const q = l.match(/[«"„“]([^«»"„“”]{3,40})[»"”]/)
    if (q) return q[1].trim()
  }
  for (const l of head.slice(0, 3)) {
    if (letters(l) >= 4 && letters(l) / l.length > 0.6 && !SKIP.test(l) && !TOTAL.test(l) && !/\d{2,}/.test(l)) return tidyName(l)
  }
  return ''
}

export function parseReceipt(text: string, section: SectionKey): ParsedReceipt {
  const raw = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const lines = raw.map(clean).filter((l) => l.length > 1)
  const items: ParsedItem[] = []
  let pending = ''
  let itemsDone = false
  let total: number | null = null
  let dueFound = false
  let servicePct: number | null = null
  let serviceAmount: number | null = null

  const push = (name: string, qty: number, lineTotal: number) => {
    const nm = tidyName(name)
    if (letters(nm) < 2 || !money(lineTotal) || qty <= 0) return
    items.push({ name: nm, qty, price: lineTotal / qty, category: categorize(nm, section) })
  }

  for (const line of lines) {
    if (SERVICE.test(line)) {
      const pct = line.match(/(\d{1,2}(?:[.,]\d)?)\s*%/)
      if (pct) servicePct = parseFloat(pct[1].replace(',', '.'))
      const amt = lastNumber(line)
      if (amt != null && (!pct || amt !== servicePct)) serviceAmount = amt
      pending = ''
      continue
    }
    if (TOTAL.test(line)) {
      itemsDone = true
      const amt = lastNumber(line)
      if (amt != null && money(amt)) {
        const due = DUE.test(line)
        if (due || (!dueFound && (total == null || amt > total))) total = amt
        dueFound ||= due
      }
      continue
    }
    if (itemsDone || SKIP.test(line) || DATE.test(line)) {
      pending = ''
      continue
    }

    const f = line.match(FISCAL)
    if (f) {
      const qty = num(f[2], true)
      const price = num(f[3].trim().split(/\s+/).join(''))
      const lineTotal = f[4] ? (lastNumber(f[4]) ?? qty * price) : qty * price
      push(letters(f[1]) >= 2 ? f[1] : pending, qty, lineTotal)
      pending = ''
      continue
    }

    const m = line.match(TAIL)
    if (m) {
      const r = readTail(m[2])
      if (r) {
        const name = letters(m[1]) >= 2 ? `${m[1]} ${r.rest}` : `${pending} ${m[1]} ${r.rest}`
        push(name, r.qty, r.total)
        pending = ''
        continue
      }
    }

    if (letters(line) === 0) {
      if (pending) {
        const r = readTail(line)
        if (r) push(pending, r.qty, r.total)
      }
      pending = ''
      continue
    }
    // a numbered line ("2. Хинкали") always starts a new item name
    const fresh = /^\d{1,3}[.)]\s*\p{L}/u.test(line)
    pending = pending && !fresh && pending.split(' ').length < 6 ? `${pending} ${line}` : line
  }

  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0)
  let service = servicePct
  if (service == null && serviceAmount != null && subtotal > 0) service = Math.round((serviceAmount / subtotal) * 1000) / 10
  return { title: findTitle(raw), items, total, service }
}
