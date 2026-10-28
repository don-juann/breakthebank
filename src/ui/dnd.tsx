import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { animate, useMotionValue, useSpring, useTransform, useVelocity } from 'motion/react'
import * as m from 'motion/react-m'

interface Point {
  clientX: number
  clientY: number
}

interface Ctx {
  active: string | null
  over: string | null
  hit: { id: string; n: number } | null
  register: (id: string, el: HTMLElement | null) => void
  begin: (el: HTMLElement, start: Point, now: Point, pointerId: number, id: string, payload: string[]) => void
}

const DragCtx = createContext<Ctx | null>(null)

const LIFT_MS = 260
const wobble = { stiffness: 380, damping: 11, mass: 0.7 }
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export function DragLayer({ onDrop, children }: { onDrop: (payload: string[], target: string) => void; children: ReactNode }) {
  const targets = useRef(new Map<string, HTMLElement>())
  const [active, setActive] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [hit, setHit] = useState<{ id: string; n: number } | null>(null)
  const overRef = useRef<string | null>(null)
  const seq = useRef(0)
  const ghost = useRef<HTMLDivElement>(null)
  const onDropRef = useRef(onDrop)
  onDropRef.current = onDrop

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const lift = useMotionValue(1)
  const opacity = useMotionValue(0)
  const vx = useVelocity(x)
  const vy = useVelocity(y)
  // stretch along the direction of travel, squash across it, like a blob of jelly
  const stretchX = useSpring(useTransform(() => clamp(1 + (Math.abs(vx.get()) - Math.abs(vy.get())) / 4500, 0.8, 1.25)), wobble)
  const stretchY = useSpring(useTransform(() => clamp(1 + (Math.abs(vy.get()) - Math.abs(vx.get())) / 4500, 0.8, 1.25)), wobble)
  const tilt = useSpring(useTransform(vx, [-2500, 2500], [-9, 9]), wobble)
  const scaleX = useTransform(() => lift.get() * stretchX.get())
  const scaleY = useTransform(() => lift.get() * stretchY.get())

  const register = useCallback((id: string, el: HTMLElement | null) => {
    if (el) targets.current.set(id, el)
    else targets.current.delete(id)
  }, [])

  const hitTest = (px: number, py: number) => {
    let best: string | null = null
    let bestD = Infinity
    for (const [id, el] of targets.current) {
      const r = el.getBoundingClientRect()
      const pad = 14
      if (px < r.left - pad || px > r.right + pad || py < r.top - pad || py > r.bottom + pad) continue
      const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2))
      if (d < bestD) {
        best = id
        bestD = d
      }
    }
    return best
  }

  const begin = useCallback<Ctx['begin']>((el, start, now, pointerId, id, payload) => {
    const g = ghost.current
    if (!g) return
    const token = ++seq.current
    const clear = () => {
      if (token === seq.current) g.replaceChildren()
    }
    const rect = el.getBoundingClientRect()
    const dx = start.clientX - rect.left
    const dy = start.clientY - rect.top
    g.replaceChildren(el.cloneNode(true))
    g.style.width = `${rect.width}px`
    g.style.height = `${rect.height}px`
    g.style.transformOrigin = `${dx}px ${dy}px`
    x.jump(now.clientX - dx)
    y.jump(now.clientY - dy)
    opacity.jump(1)
    lift.jump(1)
    animate(lift, 1.08, { type: 'spring', ...wobble })
    setActive(id)
    navigator.vibrate?.(8)

    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      x.set(e.clientX - dx)
      y.set(e.clientY - dy)
      const t = hitTest(e.clientX, e.clientY)
      if (t !== overRef.current) {
        overRef.current = t
        setOver(t)
        if (t) animate(lift, [0.92, 1.08], { type: 'spring', ...wobble })
      }
    }
    const blockScroll = (e: TouchEvent) => e.preventDefault()
    const end = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      window.removeEventListener('touchmove', blockScroll)
      const target = e.type === 'pointerup' ? overRef.current : null
      overRef.current = null
      setOver(null)
      const settle = { type: 'spring', stiffness: 420, damping: 30 } as const
      if (target) {
        const r = targets.current.get(target)!.getBoundingClientRect()
        g.style.transformOrigin = 'center'
        const tx = r.left + r.width / 2 - rect.width / 2
        const ty = r.top + r.height / 2 - rect.height / 2
        setActive(null)
        onDropRef.current(payload, target)
        setHit((h) => ({ id: target, n: (h?.n ?? 0) + 1 }))
        animate(x, tx, settle)
        animate(y, ty, settle)
        animate(lift, 0.2, settle)
        animate(opacity, 0, { duration: 0.22 }).then(clear)
      } else {
        const home = el.isConnected ? el.getBoundingClientRect() : rect
        animate(lift, 1, settle)
        animate(x, home.left, settle)
        animate(y, home.top, settle).then(() => {
          if (token !== seq.current) return
          opacity.jump(0)
          clear()
          setActive((a) => (a === id ? null : a))
        })
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    window.addEventListener('touchmove', blockScroll, { passive: false })
  }, [])

  const value = useMemo(() => ({ active, over, hit, register, begin }), [active, over, hit, register, begin])

  return (
    <DragCtx.Provider value={value}>
      {children}
      <m.div
        ref={ghost}
        className="drag-ghost"
        aria-hidden
        style={{ x, y, scaleX, scaleY, rotate: tilt, opacity, pointerEvents: 'none' }}
      />
    </DragCtx.Provider>
  )
}

/** hold (touch) or drag (mouse) to lift; a quick tap calls onTap */
export function useDraggable(id: string, payload: string[], onTap?: () => void) {
  const ctx = useContext(DragCtx)!
  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || ctx.active) return
    const el = e.currentTarget
    const touch = e.pointerType !== 'mouse'
    const start = { clientX: e.clientX, clientY: e.clientY }
    const pid = e.pointerId
    let now: Point = start
    const stop = () => {
      clearTimeout(timer)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', stop)
    }
    const lift = () => {
      stop()
      ctx.begin(el, start, now, pid, id, payload)
    }
    const timer = touch ? window.setTimeout(lift, LIFT_MS) : 0
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return
      now = ev
      const d = Math.hypot(ev.clientX - start.clientX, ev.clientY - start.clientY)
      if (touch && d > 9) stop()
      else if (!touch && d > 4) lift()
    }
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return
      stop()
      onTap?.()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', stop)
  }
  return {
    onPointerDown,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    lifted: ctx.active === id,
  }
}

export function useDropTarget(id: string) {
  const ctx = useContext(DragCtx)!
  const { register } = ctx
  const ref = useCallback((el: HTMLElement | null) => register(id, el), [register, id])
  return { ref, over: ctx.over === id, dragging: ctx.active !== null, hits: ctx.hit?.id === id ? ctx.hit.n : 0 }
}
