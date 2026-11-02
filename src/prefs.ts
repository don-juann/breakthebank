import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyPalette } from './palettes'

export type Lang = 'en' | 'kz'

interface Prefs {
  palette: string
  lang: Lang
  set: (patch: Partial<Pick<Prefs, 'palette' | 'lang'>>) => void
}

export const usePrefs = create<Prefs>()(
  persist((set) => ({ palette: 'regal', lang: 'en', set: (patch) => set(patch) }), {
    name: 'btb-prefs',
    partialize: ({ palette, lang }) => ({ palette, lang }),
  }),
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
