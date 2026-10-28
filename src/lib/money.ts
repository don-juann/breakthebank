const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

export function fmt(n: number) {
  const r = Math.round(n)
  return (r < 0 ? '−' : '') + group(Math.abs(r))
}

export const tenge = (n: number) => `${fmt(n)} ₸`

export function parseAmount(s: string) {
  const n = parseFloat(s.replace(/[\s ]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
