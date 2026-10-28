import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Hangout, Item, Person, Receipt, SectionKey } from './types'
import { uid } from './lib/money'

export type Tab = SectionKey | 'settle'

interface Nav {
  hangoutId: string | null
  receiptId: string | null
  tab: Tab
}

interface State {
  friends: Record<string, Person>
  hangouts: Hangout[]
  nav: Nav

  go: (nav: Partial<Nav>) => void
  addFriend: (p: Partial<Person> & { name: string }) => string
  updateFriend: (id: string, patch: Partial<Person>) => void
  removeFriend: (id: string) => void

  createHangout: () => string
  updateHangout: (id: string, patch: Partial<Pick<Hangout, 'name' | 'date' | 'dutch'>>) => void
  deleteHangout: (id: string) => void
  togglePerson: (hid: string, pid: string) => void

  addReceipt: (hid: string, r: Partial<Receipt> & { section: SectionKey }) => string
  updateReceipt: (hid: string, rid: string, patch: Partial<Omit<Receipt, 'id' | 'items'>>) => void
  deleteReceipt: (hid: string, rid: string) => void
  toggleMember: (hid: string, rid: string, pid: string) => void

  addItems: (hid: string, rid: string, items: Omit<Item, 'id'>[]) => void
  updateItem: (hid: string, rid: string, iid: string, patch: Partial<Item>) => void
  deleteItem: (hid: string, rid: string, iid: string) => void
  assign: (hid: string, rid: string, itemIds: string[], target: string) => void
  splitItem: (hid: string, rid: string, iid: string) => void

  loadDemo: () => string
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const edit = (hid: string, fn: (h: Hangout) => void) =>
        set((s) => ({
          hangouts: s.hangouts.map((h) => {
            if (h.id !== hid) return h
            const d = structuredClone(h)
            fn(d)
            return d
          }),
        }))
      const editReceipt = (hid: string, rid: string, fn: (r: Receipt, h: Hangout) => void) =>
        edit(hid, (h) => {
          const r = h.receipts.find((x) => x.id === rid)
          if (r) fn(r, h)
        })

      return {
        friends: {},
        hangouts: [],
        nav: { hangoutId: null, receiptId: null, tab: 'dining' },

        go: (nav) => set((s) => ({ nav: { ...s.nav, ...nav } })),

        addFriend: (p) => {
          const id = uid()
          const used = Object.keys(get().friends).length
          const friend: Person = { cashback: 0, hue: used, ...p, id }
          set((s) => ({ friends: { ...s.friends, [id]: friend } }))
          return id
        },
        updateFriend: (id, patch) =>
          set((s) => ({ friends: { ...s.friends, [id]: { ...s.friends[id], ...patch } } })),
        removeFriend: (id) =>
          set((s) => {
            const friends = { ...s.friends }
            delete friends[id]
            return { friends }
          }),

        createHangout: () => {
          const id = uid()
          const h: Hangout = { id, name: 'Jigilarmen', date: Date.now(), people: [], receipts: [] }
          set((s) => ({ hangouts: [h, ...s.hangouts] }))
          return id
        },
        updateHangout: (id, patch) => edit(id, (h) => Object.assign(h, patch)),
        deleteHangout: (id) =>
          set((s) => {
            const hangouts = s.hangouts.filter((h) => h.id !== id)
            const used = new Set(hangouts.flatMap((h) => h.people))
            const friends = Object.fromEntries(Object.entries(s.friends).filter(([fid, f]) => !f.demo || used.has(fid)))
            return { hangouts, friends }
          }),
        togglePerson: (hid, pid) =>
          edit(hid, (h) => {
            if (h.people.includes(pid)) {
              h.people = h.people.filter((x) => x !== pid)
              for (const r of h.receipts) {
                r.members = r.members.filter((x) => x !== pid)
                if (r.payerId === pid) r.payerId = null
                for (const it of r.items) it.to = it.to.filter((x) => x !== pid)
              }
            } else {
              h.people.push(pid)
              for (const r of h.receipts) r.members.push(pid)
            }
          }),

        addReceipt: (hid, r) => {
          const id = uid()
          edit(hid, (h) => {
            const payerId = r.payerId !== undefined ? r.payerId : (h.people[0] ?? null)
            h.receipts.push({
              title: '',
              members: [...h.people],
              service: 0,
              items: [],
              createdAt: Date.now(),
              ...r,
              payerId,
              cashback: r.cashback ?? (payerId ? (get().friends[payerId]?.cashback ?? 0) : 0),
              id,
            })
          })
          return id
        },
        updateReceipt: (hid, rid, patch) => editReceipt(hid, rid, (r) => Object.assign(r, patch)),
        deleteReceipt: (hid, rid) =>
          edit(hid, (h) => {
            h.receipts = h.receipts.filter((r) => r.id !== rid)
          }),
        toggleMember: (hid, rid, pid) =>
          editReceipt(hid, rid, (r) => {
            if (r.members.includes(pid)) {
              r.members = r.members.filter((x) => x !== pid)
              for (const it of r.items) it.to = it.to.filter((x) => x !== pid)
            } else r.members.push(pid)
          }),

        addItems: (hid, rid, items) =>
          editReceipt(hid, rid, (r) => {
            r.items.push(...items.map((it) => ({ ...it, id: uid() })))
          }),
        updateItem: (hid, rid, iid, patch) =>
          editReceipt(hid, rid, (r) => {
            const it = r.items.find((x) => x.id === iid)
            if (it) Object.assign(it, patch)
          }),
        deleteItem: (hid, rid, iid) =>
          editReceipt(hid, rid, (r) => {
            r.items = r.items.filter((x) => x.id !== iid)
          }),
        assign: (hid, rid, itemIds, target) =>
          editReceipt(hid, rid, (r) => {
            for (const it of r.items) {
              if (!itemIds.includes(it.id)) continue
              if (target === 'all') it.to = []
              else if (!it.to.includes(target)) it.to = [...it.to, target]
            }
          }),
        splitItem: (hid, rid, iid) =>
          editReceipt(hid, rid, (r) => {
            const i = r.items.findIndex((x) => x.id === iid)
            const it = r.items[i]
            if (!it || it.qty < 2 || !Number.isInteger(it.qty)) return
            const units = Array.from({ length: it.qty }, (_, n) => ({ ...it, id: n ? uid() : it.id, qty: 1 }))
            r.items.splice(i, 1, ...units)
          }),

        loadDemo: () => {
          const s = get()
          const mk = (name: string, cashback = 0) => s.addFriend({ name, cashback, demo: true })
          const [a, b, c, d] = [mk('Aruzhan', 5), mk('Dias'), mk('Madi'), mk('Tomiris', 3)]
          const hid = s.createHangout()
          s.updateHangout(hid, { name: 'Friday night' })
          for (const p of [a, b, c, d]) s.togglePerson(hid, p)
          s.addReceipt(hid, {
            section: 'event', title: 'Karaoke room', payerId: b,
            items: [{ id: uid(), name: 'Room, 2 hours', price: 24000, qty: 1, category: 'other', to: [] }],
          })
          s.addReceipt(hid, {
            section: 'dining', title: 'Del Papa', payerId: a, service: 10,
            items: [
              { id: uid(), name: 'Pizza Margherita', price: 4200, qty: 1, category: 'food', to: [] },
              { id: uid(), name: 'Caesar salad', price: 3100, qty: 1, category: 'food', to: [d] },
              { id: uid(), name: 'Carbonara', price: 3900, qty: 1, category: 'food', to: [c] },
              { id: uid(), name: 'Beer 0.5', price: 1600, qty: 3, category: 'alcohol', to: [] },
              { id: uid(), name: 'Lemonade 1L', price: 2400, qty: 1, category: 'drinks', to: [] },
              { id: uid(), name: 'Tiramisu', price: 2200, qty: 1, category: 'food', to: [] },
            ],
          })
          s.addReceipt(hid, {
            section: 'transport', title: 'Taxi home', payerId: c, members: [b, c],
            items: [{ id: uid(), name: 'Ride', price: 2800, qty: 1, category: 'other', to: [] }],
          })
          s.go({ tab: 'dining' })
          return hid
        },
      }
    },
    {
      name: 'bolu-v1',
      version: 2,
      partialize: (s) => ({ friends: s.friends, hangouts: s.hangouts, nav: s.nav }),
      migrate: (persisted, version) => {
        const s = persisted as Pick<State, 'friends' | 'hangouts' | 'nav'>
        if (version < 2) {
          // v1 kept banks; only Freedom cards had cashback, and receipts could inherit it via null
          type V1Person = Person & { bank?: string }
          const v1 = s.friends as Record<string, V1Person>
          const rate = (id: string | null) => (id && v1[id]?.bank === 'freedom' ? v1[id].cashback : 0)
          for (const h of s.hangouts) for (const r of h.receipts) r.cashback ??= rate(r.payerId)
          s.friends = Object.fromEntries(
            Object.values(v1).map((f) => [f.id, { id: f.id, name: f.name, hue: f.hue, demo: f.demo, cashback: rate(f.id) }]),
          )
        }
        return s
      },
    },
  ),
)

export const useHangout = (id: string | null) => useStore((s) => s.hangouts.find((h) => h.id === id))
