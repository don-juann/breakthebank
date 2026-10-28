import * as m from 'motion/react-m'
import type { HTMLMotionProps } from 'motion/react'
import { jelly } from './motion'

type Props = HTMLMotionProps<'button'> & { round?: boolean }

/** a button that squashes like jelly when pressed and wobbles back on release */
export function Press({ round, className = '', ...rest }: Props) {
  return (
    <m.button
      type="button"
      whileTap={round ? { scale: 0.84 } : { scaleX: 1.03, scaleY: 0.9 }}
      transition={jelly}
      className={className}
      {...rest}
    />
  )
}
