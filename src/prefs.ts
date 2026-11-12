import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyPalette } from './palettes'
import type { SectionKey } from './types'

export type Lang = 'en' | 'kz'

interface Prefs {
  palette: string
  lang: Lang
  /** per phone, never synced: what the last expense added here looked like */
  lastKind: SectionKey
  lastPayer: string | null
  set: (patch: Partial<Omit<Prefs, 'set'>>) => void
}

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({ palette: 'regal', lang: 'en', lastKind: 'dining', lastPayer: null, set: (patch) => set(patch) }),
    {
      name: 'btb-prefs',
      partialize: ({ palette, lang, lastKind, lastPayer }) => ({ palette, lang, lastKind, lastPayer }),
    },
  ),
)

export function initPrefs() {
  const apply = () => {
    const { palette, lang } = usePrefs.getState()
    applyPalette(palette)
    document.documentElement.lang = lang === 'kz' ? 'kk' : 'en'
  }
  apply()
  usePrefs.subscribe(apply)
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply)
}
