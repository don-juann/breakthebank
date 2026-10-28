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
}

export const SECTIONS: Record<SectionKey, { label: string; noun: string; emoji: string }> = {
  event: { label: 'Main event', noun: 'expense', emoji: '🎉' },
  dining: { label: 'Dining', noun: 'receipt', emoji: '🍽️' },
  transport: { label: 'Transport', noun: 'ride', emoji: '🚕' },
}

export const SECTION_KEYS: SectionKey[] = ['event', 'dining', 'transport']

export const CATEGORIES: Record<Category, { label: string; emoji: string }> = {
  food: { label: 'Food', emoji: '🍽️' },
  drinks: { label: 'Drinks', emoji: '🥤' },
  dessert: { label: 'Dessert', emoji: '🍰' },
  other: { label: 'Other', emoji: '🧾' },
}
