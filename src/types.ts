export type SectionKey = 'event' | 'dining' | 'transport'
export type Category = 'food' | 'drinks' | 'dessert' | 'other'

export interface Person {
  id: string
  name: string
  /** last cashback % used when they paid; the default for their next receipt */
  cashback: number
  hue: number
  demo?: boolean
}

export interface Item {
  id: string
  name: string
  price: number
  qty: number
  category: Category
  /** person ids; empty = shared by everyone on the receipt */
  to: string[]
}

export interface Receipt {
  id: string
  section: SectionKey
  title: string
  payerId: string | null
  members: string[]
  service: number
  cashback: number
  items: Item[]
  createdAt: number
}

export interface Hangout {
  id: string
  name: string
  date: number
  people: string[]
  receipts: Receipt[]
  /** split the whole hangout evenly instead of by items */
  dutch?: boolean
  /** secret key of the synced copy; set once the hangout is shared */
  shareId?: string
}

/** the hangout fields synced as one unit; receipts sync one by one */
export type HangoutMeta = Pick<Hangout, 'name' | 'date' | 'dutch' | 'people'>

// labels live in i18n.ts
export const SECTIONS: Record<SectionKey, { emoji: string }> = {
  event: { emoji: '🎉' },
  dining: { emoji: '🍽️' },
  transport: { emoji: '🚕' },
}

export const SECTION_KEYS: SectionKey[] = ['event', 'dining', 'transport']

export const CATEGORIES: Record<Category, { emoji: string }> = {
  food: { emoji: '🍽️' },
  drinks: { emoji: '🥤' },
  dessert: { emoji: '🍰' },
  other: { emoji: '🧾' },
}
