import type { ReactNode } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { useHangout, useStore } from './store'
import { back, standalone } from './nav'
import { Home } from './screens/Home'
import { HangoutView } from './screens/HangoutView'
import { ReceiptView } from './screens/ReceiptView'
import { Toaster } from './ui/toast'
import { push } from './ui/motion'

export default function App() {
  const nav = useStore((s) => s.nav)
  const hangout = useHangout(nav.hangoutId)
  const receipt = hangout?.receipts.find((r) => r.id === nav.receiptId)
  return (
    <>
      <Layer root covered={!!hangout}>
        <Home />
      </Layer>
      <AnimatePresence>
        {hangout && (
          <Layer key={hangout.id} covered={!!receipt}>
            <HangoutView hangout={hangout} />
          </Layer>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {hangout && receipt && (
          <Layer key={receipt.id}>
            <ReceiptView hangout={hangout} receipt={receipt} />
          </Layer>
        )}
      </AnimatePresence>
      <Toaster />
    </>
  )
}

/** a pushed screen: slides in from the right, parallaxes away when covered, swipe from the edge to go back */
function Layer({ root, covered, children }: { root?: boolean; covered?: boolean; children: ReactNode }) {
  const controls = useDragControls()
  return (
    <m.div
      className="layer"
      initial={root ? false : { x: '100%' }}
      animate={{ x: covered ? '-28%' : 0 }}
      exit={{ x: '100%' }}
      transition={push}
      drag={root ? false : 'x'}
      dragControls={controls}
      dragListener={false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 1 }}
      dragMomentum={false}
      onDragEnd={(_, i) => {
        if (i.offset.x > 100 || i.velocity.x > 500) back()
      }}
    >
      {children}
      {!root && standalone && <div className="edge" onPointerDown={(e) => controls.start(e)} />}
      <m.div
        className="layer-dim"
        initial={false}
        animate={{ opacity: covered ? 1 : 0 }}
        transition={push}
        style={{ pointerEvents: covered ? 'auto' : 'none' }}
      />
    </m.div>
  )
}
