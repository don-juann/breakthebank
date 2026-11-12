import { memo, type CSSProperties } from 'react'

const COUNT = 12
const rand = (a: number, b: number) => a + Math.random() * (b - a)

// columns are shuffled so pieces spread across the screen without clumping
const columns = Array.from({ length: COUNT }, (_, i) => i).sort(() => Math.random() - 0.5)

const PIECES = columns.map((col, i) => {
  const near = rand(0, 1)
  const fall = 34 - near * 14
  return {
    coin: i % 3 === 2,
    style: {
      left: `${((col + rand(0.15, 0.85)) / COUNT) * 100}%`,
      opacity: 0.05 + near * 0.07,
      '--size': `${Math.round(22 + near * 20)}px`,
      '--fall': `${fall.toFixed(1)}s`,
      '--delay': `${(-rand(0, fall)).toFixed(1)}s`,
      '--sway': `${rand(3.5, 6).toFixed(1)}s`,
      '--spin': `${rand(2.5, 4.5).toFixed(1)}s`,
      '--drift': `${Math.round(rand(10, 26))}px`,
      '--tilt': `${Math.round(rand(12, 28))}deg`,
    } as CSSProperties,
  }
})

const Note = () => (
  <svg viewBox="0 0 60 32">
    <rect x="1" y="1" width="58" height="30" rx="5" fill="currentColor" />
    <rect className="ink" x="5" y="5" width="50" height="22" rx="3" fill="none" strokeWidth="1.6" />
    <path className="ink" d="M24.5 10.5h11M24.5 14h11M30 14v9" fill="none" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const Coin = () => (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill="currentColor" />
    <circle className="ink" cx="12" cy="12" r="8" fill="none" strokeWidth="1.2" />
    <path className="ink" d="M8.5 8.5h7M8.5 11h7M12 11v5.5" fill="none" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

/** slow banknotes and coins drifting down behind a screen's content */
export const MoneyRain = memo(function MoneyRain({ paused }: { paused?: boolean }) {
  return (
    <div className={`rain ${paused ? 'paused' : ''}`} aria-hidden>
      {PIECES.map((p, i) => (
        <span key={i} className={`drop ${p.coin ? 'coin' : 'note'}`} style={p.style}>
          <span className="flutter">{p.coin ? <Coin /> : <Note />}</span>
        </span>
      ))}
    </div>
  )
})
