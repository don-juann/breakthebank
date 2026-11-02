type Mode = Record<
  'bg' | 'surface' | 'surface-2' | 'text' | 'accent' | 'accent-ink' | 'on-accent' | 'tint' | 'good' | 'bad' | 'warn' | 't1' | 't2',
  string
>

export interface Palette {
  key: string
  name: string
  swatches: string[]
  /** token overrides; Regal has none since it's the stylesheet default */
  light?: Mode
  dark?: Mode
  /** food, drinks, dessert, other */
  cats?: [string, string, string, string]
  avatars?: string[]
}

const CATS = ['food', 'drinks', 'dessert', 'other']
const SEEDS = [
  'bg', 'surface', 'surface-2', 'text', 'accent', 'accent-ink', 'on-accent', 'tint', 'good', 'bad', 'warn', 't1', 't2',
  ...CATS.map((c) => `cat-${c}`),
  ...Array.from({ length: 8 }, (_, i) => `ava-${i}`),
]

export const PALETTES: Palette[] = [
  { key: 'regal', name: 'Regal', swatches: ['#11100f', '#5d1c34', '#a67d44', '#899481', '#cdbcab', '#efe9e1'] },
  {
    key: 'luxe',
    name: 'Luxe',
    swatches: ['#322d29', '#72383d', '#ac9c8d', '#d1c7bd', '#d9d9d9', '#efe9e1'],
    light: {
      bg: '#efe9e1', surface: '#faf7f3', 'surface-2': '#f3eee8', text: '#2a2522', accent: '#72383d', 'accent-ink': '#72383d',
      'on-accent': '#efe9e1', tint: '#ac9c8d', good: '#5e7059', bad: '#9b3a40', warn: '#8a6a45', t1: '#72383d', t2: '#ac9c8d',
    },
    dark: {
      bg: '#1a1715', surface: '#25211e', 'surface-2': '#322d29', text: '#efe9e1', accent: '#874349', 'accent-ink': '#d1c7bd',
      'on-accent': '#efe9e1', tint: '#d1c7bd', good: '#a8b59c', bad: '#d99aa0', warn: '#d1b48c', t1: '#d1c7bd', t2: '#ac9c8d',
    },
    cats: ['#ac9c8d', '#8e9196', '#72383d', '#5f5650'],
    avatars: ['#72383d', '#ac9c8d', '#322d29', '#8e6f62', '#9a5a5f', '#7a6d63', '#9f8e80', '#5b4a44'],
  },
  {
    key: 'ocean',
    name: 'Ocean ruby',
    swatches: ['#d8226c', '#b2dae4', '#f86a38', '#029456', '#005bb3'],
    light: {
      bg: '#eef6f8', surface: '#ffffff', 'surface-2': '#f3f8fa', text: '#0d1b2a', accent: '#005bb3', 'accent-ink': '#005bb3',
      'on-accent': '#ffffff', tint: '#6aa9c0', good: '#027a47', bad: '#c41d62', warn: '#d9541f', t1: '#005bb3', t2: '#d8226c',
    },
    dark: {
      bg: '#08121c', surface: '#112030', 'surface-2': '#1a2c3e', text: '#eaf4f7', accent: '#1a6fc4', 'accent-ink': '#b2dae4',
      'on-accent': '#ffffff', tint: '#b2dae4', good: '#3dc58a', bad: '#f06a9e', warn: '#f8925e', t1: '#b2dae4', t2: '#f06a9e',
    },
    cats: ['#f86a38', '#3d8fc6', '#d8226c', '#6b7c8a'],
    avatars: ['#005bb3', '#d8226c', '#029456', '#f86a38', '#3d8fc6', '#9c2a6b', '#0f7a82', '#c2562c'],
  },
  {
    key: 'jade',
    name: 'Tropical jade',
    swatches: ['#fca47c', '#23ced9', '#f9d779', '#a1cca6', '#097c87'],
    light: {
      bg: '#fdf6ee', surface: '#ffffff', 'surface-2': '#fbf0e4', text: '#10292b', accent: '#097c87', 'accent-ink': '#097c87',
      'on-accent': '#ffffff', tint: '#a1cca6', good: '#3f8a52', bad: '#d4552b', warn: '#b98a12', t1: '#097c87', t2: '#e8875a',
    },
    dark: {
      bg: '#071a1c', surface: '#0f2629', 'surface-2': '#173236', text: '#eef8f6', accent: '#0a8f9b', 'accent-ink': '#23ced9',
      'on-accent': '#ffffff', tint: '#a1cca6', good: '#a1cca6', bad: '#ff8f6b', warn: '#f9d779', t1: '#23ced9', t2: '#f9d779',
    },
    cats: ['#f08a5d', '#23aeb8', '#e2b33c', '#7aa882'],
    avatars: ['#097c87', '#e5784a', '#23aeb8', '#d29a1e', '#7aa882', '#0b5f68', '#d9714a', '#5fb7a4'],
  },
  {
    key: 'clay',
    name: 'Sunlit clay',
    swatches: ['#fac794', '#f3a950', '#c75a2a', '#7e8d71', '#154230'],
    light: {
      bg: '#fdf3e7', surface: '#fffaf3', 'surface-2': '#fbecd9', text: '#1c2a22', accent: '#154230', 'accent-ink': '#154230',
      'on-accent': '#fac794', tint: '#d9a066', good: '#5f7a52', bad: '#b14b20', warn: '#b8741a', t1: '#154230', t2: '#c75a2a',
    },
    dark: {
      bg: '#0b1610', surface: '#14231b', 'surface-2': '#1d3127', text: '#fdf0e0', accent: '#1f5c43', 'accent-ink': '#f3a950',
      'on-accent': '#fdf0e0', tint: '#fac794', good: '#a9b89b', bad: '#f08a5c', warn: '#f3c06e', t1: '#fac794', t2: '#f3a950',
    },
    cats: ['#f3a950', '#7e8d71', '#c75a2a', '#8a7a66'],
    avatars: ['#154230', '#c75a2a', '#7e8d71', '#e0912f', '#2f6b52', '#a0522d', '#d9925a', '#56664a'],
  },
]

export function applyPalette(key: string) {
  const p = PALETTES.find((x) => x.key === key) ?? PALETTES[0]
  const dark = matchMedia('(prefers-color-scheme: dark)').matches
  const style = document.documentElement.style
  for (const s of SEEDS) style.removeProperty(`--${s}`)
  const vars: Record<string, string> = { ...(dark ? p.dark : p.light) }
  p.cats?.forEach((c, i) => (vars[`cat-${CATS[i]}`] = c))
  p.avatars?.forEach((c, i) => (vars[`ava-${i}`] = c))
  for (const [k, v] of Object.entries(vars)) style.setProperty(`--${k}`, v)
  const metas = document.querySelectorAll('meta[name="theme-color"]')
  metas[0]?.setAttribute('content', p.light?.bg ?? '#efe9e1')
  metas[1]?.setAttribute('content', p.dark?.bg ?? '#11100f')
}
