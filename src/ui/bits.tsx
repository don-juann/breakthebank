import { useEffect, type ReactNode } from 'react'
import { useSpring, useTransform } from 'motion/react'
import * as m from 'motion/react-m'
import type { Person } from '../types'
import { tenge } from '../lib/money'
import { Press } from './Press'
import { jelly, snappy } from './motion'

export const initials = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'

const AVATAR = ['#5d1c34', '#a67d44', '#899481', '#3a3532', '#8c4a5f', '#7c5a2c', '#5e6a55', '#9c8670']

export const personBg = (hue: number) => {
  const c = AVATAR[Math.abs(hue) % AVATAR.length]
  return `linear-gradient(140deg, color-mix(in srgb, ${c}, #fff 22%), ${c})`
}

export function Avatar({ person, size = 40 }: { person: Person; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: personBg(person.hue) }}>
      {initials(person.name)}
    </span>
  )
}

/** amount that rolls smoothly to its new value */
export function Money({ value, className }: { value: number; className?: string }) {
  const mv = useSpring(value, { stiffness: 220, damping: 30 })
  useEffect(() => mv.set(value), [mv, value])
  const text = useTransform(mv, (v) => tenge(v))
  return <m.span className={`num ${className ?? ''}`}>{text}</m.span>
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 100,
  suffix = '%',
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  suffix?: string
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 10) / 10))
  return (
    <div className="stepper">
      <Press round className="step-btn" onClick={() => onChange(clamp(value - step))} aria-label="Decrease">
        −
      </Press>
      <m.span key={value} className="step-val num" initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={jelly}>
        {value}
        {suffix}
      </m.span>
      <Press round className="step-btn" onClick={() => onChange(clamp(value + step))} aria-label="Increase">
        +
      </Press>
    </div>
  )
}

/** horizontal row of people; single or multi select */
export function PeoplePicker({
  people,
  selected,
  onToggle,
  dimUnselected = true,
  wrap,
  size = 44,
  children,
}: {
  people: Person[]
  selected: string[]
  onToggle: (id: string) => void
  dimUnselected?: boolean
  wrap?: boolean
  size?: number
  children?: ReactNode
}) {
  return (
    <div className={`picker ${wrap ? 'wrap' : ''}`}>
      {people.map((p) => {
        const on = selected.includes(p.id)
        return (
          <Press
            key={p.id}
            round
            className={`pick ${on ? 'on' : ''}`}
            onClick={() => onToggle(p.id)}
            animate={{ opacity: on || !dimUnselected ? 1 : 0.42 }}
          >
            <span className="pick-ava">
              <Avatar person={p} size={size} />
              {on && (
                <m.span className="pick-check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={jelly}>
                  ✓
                </m.span>
              )}
            </span>
            <span className="pick-name">{p.name}</span>
          </Press>
        )
      })}
      {children}
    </div>
  )
}

export function AddTile({ label, onClick, size = 44 }: { label: string; onClick: () => void; size?: number }) {
  return (
    <Press round className="pick" onClick={onClick}>
      <span className="pick-ava add-ava" style={{ width: size, height: size }}>
        +
      </span>
      <span className="pick-name">{label}</span>
    </Press>
  )
}

export function AvatarStack({ people, size = 22 }: { people: Person[]; size?: number }) {
  return (
    <span className="stack">
      {people.slice(0, 4).map((p) => (
        <m.span key={p.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={jelly}>
          <Avatar person={p} size={size} />
        </m.span>
      ))}
      {people.length > 4 && <span className="stack-more">+{people.length - 4}</span>}
    </span>
  )
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" className="switch-row" onClick={() => onChange(!on)}>
      <span>{label}</span>
      <span className={`switch ${on ? 'on' : ''}`}>
        <m.span className="knob" layout transition={jelly} />
      </span>
    </button>
  )
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

export function Empty({ emoji, title, text }: { emoji: string; title: string; text?: string }) {
  return (
    <m.div className="empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={snappy}>
      <m.div
        className="empty-emoji"
        animate={{ y: [0, -8, 0], rotate: [0, -4, 4, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {emoji}
      </m.div>
      <div className="empty-title">{title}</div>
      {text && <div className="empty-text">{text}</div>}
    </m.div>
  )
}
