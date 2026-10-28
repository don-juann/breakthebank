import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { sheetSpring } from './motion'

interface Props {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function Sheet({ open, onClose, title, children, footer }: Props) {
  const controls = useDragControls()
  const grab = (e: React.PointerEvent) => controls.start(e)
  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div key="sheet" className="sheet-wrap">
          <m.div
            className="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <m.div
            className="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetSpring}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.06, bottom: 0.9 }}
            onDragEnd={(_, i) => {
              if (i.offset.y > 110 || i.velocity.y > 650) onClose()
            }}
          >
            <div className="sheet-grab" onPointerDown={grab}>
              <span />
            </div>
            {title && (
              <h3 className="sheet-title" onPointerDown={grab}>
                {title}
              </h3>
            )}
            <div className="sheet-body">{children}</div>
            {footer && <div className="sheet-footer">{footer}</div>}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
