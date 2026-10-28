import { create } from 'zustand'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { jelly } from './motion'

const useToast = create<{ msg: string | null; n: number }>(() => ({ msg: null, n: 0 }))
let timer = 0

export function toast(msg: string) {
  clearTimeout(timer)
  useToast.setState((s) => ({ msg, n: s.n + 1 }))
  timer = window.setTimeout(() => useToast.setState({ msg: null }), 1800)
}

export function Toaster() {
  const { msg, n } = useToast()
  return (
    <AnimatePresence>
      {msg && (
        <m.div
          key={n}
          className="toast"
          initial={{ y: -40, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -30, opacity: 0, scale: 0.9 }}
          transition={jelly}
        >
          {msg}
        </m.div>
      )}
    </AnimatePresence>
  )
}
