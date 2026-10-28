import { useStore } from './store'

const go = useStore.getState().go

export function openHangout(id: string) {
  go({ hangoutId: id, receiptId: null })
  history.pushState({ depth: 1 }, '')
}

export function openReceipt(id: string) {
  go({ receiptId: id })
  history.pushState({ depth: 2 }, '')
}

export const back = () => history.back()

export function initNav() {
  const { hangoutId, receiptId } = useStore.getState().nav
  history.replaceState({ depth: 0 }, '')
  if (hangoutId) history.pushState({ depth: 1 }, '')
  if (hangoutId && receiptId) history.pushState({ depth: 2 }, '')
  window.addEventListener('popstate', (e) => {
    const depth = (e.state as { depth?: number } | null)?.depth ?? 0
    const { nav } = useStore.getState()
    go({ receiptId: depth >= 2 ? nav.receiptId : null, hangoutId: depth >= 1 ? nav.hangoutId : null })
  })
}

export const standalone =
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
