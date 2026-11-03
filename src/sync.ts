import { useStore, type RemotePatch } from './store'
import { uid } from './lib/money'
import { CATEGORIES, SECTION_KEYS, type Category, type Hangout, type HangoutMeta, type Person, type Receipt, type SectionKey } from './types'

/**
 * Shared hangouts live in Neon (api/sync.ts). Each phone keeps its own copy and remembers
 * what it last agreed on with the server; anything that differs from that was edited here
 * and gets pushed. Receipts sync one by one, so two people editing different receipts
 * never clash; on the same receipt the later push wins.
 */

type Mode = 'create' | 'pull' | 'push'

interface Snapshot {
  cursor: number
  meta: string
  people: string
  receipts: Record<string, string>
}

interface Reply {
  now: number
  meta?: unknown
  people?: unknown
  receipts: { id: string; data: unknown }[]
}

const KEY = 'btb-sync'
const POLL = 10_000
const blank = (): Snapshot => ({ cursor: 0, meta: '', people: '', receipts: {} })

let snaps: Record<string, Snapshot> = {}
try {
  snaps = JSON.parse(localStorage.getItem(KEY) ?? '{}')
} catch {
  /* start fresh */
}
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(snaps))
  } catch {
    /* storage full or blocked */
  }
}

/** JSON with sorted keys, so equal data always compares equal */
const stable = (v: unknown) =>
  JSON.stringify(v, (_, x) =>
    x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x,
  )

const metaOf = (h: Hangout): HangoutMeta => ({ name: h.name, date: h.date, dutch: !!h.dutch, people: h.people })
const peopleOf = (h: Hangout, friends: Record<string, Person>) =>
  Object.fromEntries(
    h.people.filter((id) => friends[id]).map((id) => {
      const { name, hue, cashback } = friends[id]
      return [id, { id, name, hue, cashback }]
    }),
  )

// data from the server was written by other phones, so check its shape before using it
type Raw = Record<string, unknown>
const obj = (v: unknown): Raw => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {})
const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, 200) : '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

const cleanMeta = (v: unknown): HangoutMeta => {
  const m = obj(v)
  return { name: str(m.name), date: num(m.date) || Date.now(), dutch: m.dutch === true, people: strs(m.people) }
}

const cleanPeople = (v: unknown): Record<string, Person> =>
  Object.fromEntries(
    Object.values(obj(v))
      .map(obj)
      .filter((p) => str(p.id))
      .map((p) => [str(p.id), { id: str(p.id), name: str(p.name) || '?', hue: num(p.hue), cashback: num(p.cashback) }]),
  )

const cleanReceipt = (v: unknown): Receipt => {
  const r = obj(v)
  return {
    id: str(r.id),
    section: SECTION_KEYS.includes(r.section as SectionKey) ? (r.section as SectionKey) : 'event',
    title: str(r.title),
    payerId: typeof r.payerId === 'string' ? r.payerId : null,
    members: strs(r.members),
    service: num(r.service),
    cashback: num(r.cashback),
    createdAt: num(r.createdAt),
    items: (Array.isArray(r.items) ? r.items : []).map(obj).map((it) => ({
      id: str(it.id) || uid(),
      name: str(it.name),
      price: num(it.price),
      qty: num(it.qty) || 1,
      category: str(it.category) in CATEGORIES ? (it.category as Category) : 'other',
      to: strs(it.to),
    })),
  }
}

async function post(body: object): Promise<Reply | number> {
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.ok ? await res.json() : res.status
  } catch {
    return 0
  }
}

async function run(hid: string, mode: Mode): Promise<boolean> {
  const st = useStore.getState()
  const h = st.hangouts.find((x) => x.id === hid)
  if (!h?.shareId) return false
  const key = h.shareId
  const snap = mode === 'create' ? blank() : (snaps[key] ?? blank())

  const meta = metaOf(h)
  const people = peopleOf(h, st.friends)
  const sentMeta = stable(meta)
  const sentPeople = stable(people)
  const sent: Record<string, string> = {}
  const receipts = h.receipts.filter((r) => (sent[r.id] = stable(r)) !== snap.receipts[r.id])
  const deleted = Object.keys(snap.receipts).filter((id) => !(id in sent))
  const head = mode === 'create' || sentMeta !== snap.meta || sentPeople !== snap.people
  if (mode === 'push' && !head && !receipts.length && !deleted.length) return true

  const res = await post({
    id: key,
    since: snap.cursor,
    create: mode === 'create',
    ...(head ? { meta, people } : {}),
    ...(receipts.length ? { receipts } : {}),
    ...(deleted.length ? { deleted } : {}),
  })
  // the server lost this hangout (or never got it): upload everything again
  if (res === 404 && mode !== 'create') return run(hid, 'create')
  if (typeof res === 'number') return false

  // the server now has what we sent
  if (head) {
    snap.meta = sentMeta
    snap.people = sentPeople
  }
  for (const r of receipts) snap.receipts[r.id] = sent[r.id]
  for (const id of deleted) delete snap.receipts[id]

  // take what others changed, unless it was edited here in the meantime (that goes out next round)
  const now = useStore.getState()
  const cur = now.hangouts.find((x) => x.id === hid)
  if (!cur) return true
  const patch: RemotePatch = { upsert: [], remove: [] }
  if (res.meta && res.people && stable(metaOf(cur)) === snap.meta && stable(peopleOf(cur, now.friends)) === snap.people) {
    const m = cleanMeta(res.meta)
    const p = cleanPeople(res.people)
    if (stable(m) !== snap.meta || stable(p) !== snap.people) {
      patch.meta = m
      patch.people = p
    }
  }
  const touched: string[] = []
  for (const row of res.receipts) {
    const local = cur.receipts.find((r) => r.id === row.id)
    if ((local ? stable(local) : undefined) !== snap.receipts[row.id]) continue
    if (row.data) {
      const r = cleanReceipt(row.data)
      if (stable(r) === snap.receipts[row.id]) continue
      patch.upsert.push(r)
    } else if (local) patch.remove.push(row.id)
    else continue
    touched.push(row.id)
  }
  if (patch.meta || touched.length) {
    now.mergeRemote(hid, patch)
    const after = useStore.getState()
    const merged = after.hangouts.find((x) => x.id === hid)
    if (merged) {
      if (patch.meta) {
        snap.meta = stable(metaOf(merged))
        snap.people = stable(peopleOf(merged, after.friends))
      }
      for (const id of touched) {
        const r = merged.receipts.find((x) => x.id === id)
        if (r) snap.receipts[id] = stable(r)
        else delete snap.receipts[id]
      }
    }
  }
  snap.cursor = res.now
  snaps[key] = snap
  save()
  return true
}

// one round per hangout at a time; a request during a round runs right after it
const inflight = new Map<string, Promise<boolean>>()
const queued = new Map<string, Mode>()

export function syncHangout(hid: string, mode: Mode = 'pull'): Promise<boolean> {
  const running = inflight.get(hid)
  if (running) {
    if (queued.get(hid) !== 'pull') queued.set(hid, mode)
    return running
  }
  const p = run(hid, mode).finally(() => {
    inflight.delete(hid)
    const next = queued.get(hid)
    queued.delete(hid)
    if (next) void syncHangout(hid, next)
  })
  inflight.set(hid, p)
  return p
}

const SHARE_ID = /^[\w-]{16,64}$/

const shareKey = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const shareLink = (shareId: string) => `${location.origin}/?join=${shareId}`

export async function shareHangout(hid: string) {
  const st = useStore.getState()
  st.updateHangout(hid, { shareId: shareKey() })
  const ok = await syncHangout(hid, 'create')
  if (!ok) st.updateHangout(hid, { shareId: undefined })
  return ok
}

/** accepts the full link or just its code; returns the local hangout id */
export async function joinHangout(input: string): Promise<string | null> {
  const key = input.match(/join=([\w-]+)/)?.[1] ?? input.trim()
  if (!SHARE_ID.test(key)) return null
  const st = useStore.getState()
  const have = st.hangouts.find((h) => h.shareId === key)
  if (have) return have.id
  const res = await post({ id: key, since: 0 })
  if (typeof res === 'number' || !res.meta || !res.people) return null

  const receipts = res.receipts
    .filter((r) => r.data)
    .map((r) => cleanReceipt(r.data))
    .sort((a, b) => a.createdAt - b.createdAt)
  const id = uid()
  st.importHangout({ id, shareId: key, ...cleanMeta(res.meta), receipts }, cleanPeople(res.people))
  const after = useStore.getState()
  const h = after.hangouts.find((x) => x.id === id)
  if (!h) return null
  snaps[key] = {
    cursor: res.now,
    meta: stable(metaOf(h)),
    people: stable(peopleOf(h, after.friends)),
    receipts: Object.fromEntries(h.receipts.map((r) => [r.id, stable(r)])),
  }
  save()
  return id
}

const each = (mode: Mode) => {
  const hangouts = useStore.getState().hangouts
  for (const h of hangouts) if (h.shareId) void syncHangout(h.id, mode)
  const live = new Set(hangouts.map((h) => h.shareId))
  for (const k of Object.keys(snaps)) if (!live.has(k)) delete snaps[k]
  save()
}

export function initSync() {
  let timer = 0
  useStore.subscribe((s, prev) => {
    const opened = s.nav.hangoutId
    if (opened && opened !== prev.nav.hangoutId && s.hangouts.some((h) => h.id === opened && h.shareId)) void syncHangout(opened)
    if (s.hangouts === prev.hangouts && s.friends === prev.friends) return
    clearTimeout(timer)
    timer = window.setTimeout(() => each('push'), 700)
  })
  setInterval(() => {
    const open = useStore.getState().nav.hangoutId
    if (open && document.visibilityState === 'visible') void syncHangout(open)
  }, POLL)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && each('pull'))
  window.addEventListener('online', () => each('pull'))
  each('pull')
}
