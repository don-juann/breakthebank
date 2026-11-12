import { create } from 'zustand'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { jelly } from './motion'

interface Action {
  label: string
  run: () => void
}

const useToast = create<{ msg: string | null; n: number; action?: Action }>(() => ({ msg: null, n: 0 }))
let timer = 0

/** an action (like Undo) keeps the toast up longer */
export function toast(msg: string, action?: Action) {
  clearTimeout(timer)
  useToast.setState((s) => ({ msg, action, n: s.n + 1 }))
  timer = window.setTimeout(() => useToast.setState({ msg: null }), action ? 5000 : 1800)
}

export function Toaster() {
  const { msg, n, action } = useToast()
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
          {action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                clearTimeout(timer)
                useToast.setState({ msg: null })
                action.run()
              }}
            >
              {action.label}
            </button>
          )}
        </m.div>
      )}
    </AnimatePresence>
  )
}
