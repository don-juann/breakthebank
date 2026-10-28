import type { Transition } from 'motion/react'

/** springy with a visible overshoot: the "jelly" feel */
export const jelly: Transition = { type: 'spring', stiffness: 520, damping: 16, mass: 0.9 }
export const snappy: Transition = { type: 'spring', stiffness: 420, damping: 34 }
export const push: Transition = { type: 'spring', stiffness: 360, damping: 38, mass: 0.9 }
export const sheetSpring: Transition = { type: 'spring', stiffness: 380, damping: 34 }
