import { SECTIONS, SECTION_KEYS, type Hangout, type Person, type Receipt, type SectionKey } from '../types'
import { tenge } from './money'

type People = Record<string, Person>

export interface ReceiptCalc {
  subtotal: number
  service: number
  total: number
  rate: number
  cashback: number
  /** what each person owes for this receipt, after service and cashback */
  shares: Record<string, number>
}

export function calcReceipt(r: Receipt, people: People): ReceiptCalc {
  const members = r.members.filter((id) => people[id])
  const base: Record<string, number> = {}
  let subtotal = 0
  for (const it of r.items) {
    const amount = it.price * it.qty
    subtotal += amount
    const picked = it.to.filter((id) => members.includes(id))
    const eaters = picked.length ? picked : members
    for (const id of eaters) base[id] = (base[id] ?? 0) + amount / eaters.length
  }
  const svc = r.service / 100
  const rate = r.cashback / 100
  const total = subtotal * (1 + svc)
  const shares: Record<string, number> = {}
  for (const id in base) shares[id] = base[id] * (1 + svc) * (1 - rate)
  return { subtotal, service: subtotal * svc, total, rate, cashback: total * rate, shares }
}

export interface PersonSummary {
  id: string
  spent: number
  paid: number
  cashback: number
  balance: number
  bySection: Record<SectionKey, number>
}

export interface Transfer {
  from: string
  to: string
  amount: number
  key: string
}

export interface Settlement {
  total: number
  cashback: number
  /** equal share per person when going Dutch */
  each: number
  people: PersonSummary[]
  transfers: Transfer[]
  skipped: number
}

export function settle(h: Hangout, people: People): Settlement {
  const sum: Record<string, PersonSummary> = {}
  for (const id of h.people) {
    if (people[id]) sum[id] = { id, spent: 0, paid: 0, cashback: 0, balance: 0, bySection: { event: 0, dining: 0, transport: 0 } }
  }
  let total = 0
  let cashback = 0
  let skipped = 0
  const net: Record<SectionKey, number> = { event: 0, dining: 0, transport: 0 }
  for (const r of h.receipts) {
    const c = calcReceipt(r, people)
    if (c.total <= 0) continue
    const payer = r.payerId ? sum[r.payerId] : undefined
    if (!payer || (!h.dutch && !Object.keys(c.shares).length)) {
      skipped++
      continue
    }
    total += c.total
    cashback += c.cashback
    net[r.section] += c.total - c.cashback
    payer.paid += c.total
    payer.cashback += c.cashback
    for (const id in c.shares) {
      if (!sum[id]) continue
      sum[id].spent += c.shares[id]
      sum[id].bySection[r.section] += c.shares[id]
    }
  }
  const list = Object.values(sum)
  const each = list.length ? (total - cashback) / list.length : 0
  if (h.dutch) {
    for (const p of list) {
      p.spent = each
      for (const k of SECTION_KEYS) p.bySection[k] = net[k] / list.length
    }
  }
  for (const p of list) p.balance = p.paid - p.cashback - p.spent
  return { total, cashback, each, people: list, transfers: minimizeTransfers(list), skipped }
}

function minimizeTransfers(list: PersonSummary[]): Transfer[] {
  const bal = list.map((p) => ({ id: p.id, b: Math.round(p.balance) }))
  const drift = bal.reduce((s, x) => s + x.b, 0)
  if (drift && bal.length) {
    const big = bal.reduce((a, x) => (Math.abs(x.b) > Math.abs(a.b) ? x : a))
    big.b -= drift
  }
  const cred = bal.filter((x) => x.b > 0).sort((a, b) => b.b - a.b)
  const debt = bal.filter((x) => x.b < 0).sort((a, b) => a.b - b.b)
  const out: Transfer[] = []
  const push = (from: string, to: string, amount: number) =>
    out.push({ from, to, amount, key: `${from}>${to}>${amount}` })

  for (const d of debt) {
    const twin = cred.find((c) => c.b === -d.b)
    if (twin) {
      push(d.id, twin.id, twin.b)
      twin.b = 0
      d.b = 0
    }
  }
  let i = 0
  let j = 0
  while (i < cred.length && j < debt.length) {
    if (cred[i].b <= 0) { i++; continue }
    if (debt[j].b >= 0) { j++; continue }
    const amount = Math.min(cred[i].b, -debt[j].b)
    push(debt[j].id, cred[i].id, amount)
    cred[i].b -= amount
    debt[j].b += amount
  }
  return out
}

export const shortDate = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export function buildMessage(h: Hangout, people: People, s: Settlement, opts: { breakdown: boolean }) {
  const name = (id: string) => people[id]?.name ?? '?'
  const date = shortDate(h.date)
  const title = h.name.trim() || 'Hangout'
  const lines = [`🧾 ${title.includes(date) ? title : `${title} · ${date}`}`]
  lines.push(`💰 Total ${tenge(s.total)}` + (s.cashback >= 1 ? ` · cashback ${tenge(s.cashback)}` : ''))
  if (h.dutch) lines.push(`🇳🇱 Going Dutch: ${tenge(s.each)} each`)
  lines.push('')
  if (!s.transfers.length) lines.push('✅ All square, nobody owes anything')
  else {
    lines.push('💸 Transfers')
    for (const t of s.transfers) lines.push(`${name(t.from)} → ${tenge(t.amount)} → ${name(t.to)}`)
  }
  if (opts.breakdown && !h.dutch) {
    lines.push('', '📊 Who spent what')
    for (const p of [...s.people].sort((a, b) => b.spent - a.spent)) {
      if (p.spent < 1) continue
      const parts = SECTION_KEYS.filter((k) => p.bySection[k] >= 1).map((k) => `${SECTIONS[k].emoji} ${tenge(p.bySection[k])}`)
      lines.push(`${name(p.id)} — ${tenge(p.spent)}` + (parts.length > 1 ? ` (${parts.join(' · ')})` : ''))
    }
  }
  return lines.join('\n')
}
