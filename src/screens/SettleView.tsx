import { useMemo, useState } from 'react'
import * as m from 'motion/react-m'
import { useStore } from '../store'
import { buildMessage, settle, type Transfer } from '../lib/split'
import { fmt, tenge } from '../lib/money'
import type { Hangout, Person } from '../types'
import { Press } from '../ui/Press'
import { Avatar, Money, Switch, copyText } from '../ui/bits'
import { Sheet } from '../ui/Sheet'
import { FlagNL, IconCopy, IconShare } from '../ui/icons'
import { jelly } from '../ui/motion'
import { toast } from '../ui/toast'
import { useT } from '../i18n'

export function SettleSheet({ hangout, open, onClose }: { hangout: Hangout; open: boolean; onClose: () => void }) {
  const t = useT()
  return (
    <Sheet open={open} onClose={onClose} title={t.settleUp}>
      {open && <Settle hangout={hangout} />}
    </Sheet>
  )
}

function Settle({ hangout: h }: { hangout: Hangout }) {
  const friends = useStore((s) => s.friends)
  const s = useMemo(() => settle(h, friends), [h, friends])
  const [breakdown, setBreakdown] = useState(true)
  const t = useT()
  const msg = buildMessage(h, friends, s, { breakdown, t })

  const copy = async () => toast((await copyText(msg)) ? t.copied : t.copyFailed)
  const share = () => navigator.share({ text: msg }).catch(() => {})
  const toggleDutch = () => useStore.getState().updateHangout(h.id, { dutch: !h.dutch })

  return (
    <div className="settle">
      {s.transfers.length === 0 ? (
        <div className="card pad all-square">{s.total > 0 ? `✅ ${t.allSquare}` : t.addFirst}</div>
      ) : (
        // transfers feed out of a slot, one after another
        <div className="slip">
          {s.transfers.map((tr, i) => (
            <TransferRow key={tr.key} tr={tr} i={i} friends={friends} />
          ))}
        </div>
      )}

      {s.skipped > 0 && <div className="warn-card">{t.skipped(s.skipped)}</div>}

      <div className="stats">
        <div className="stat">
          <span className="stat-label">{t.totalSpent}</span>
          <Money value={s.total} className="stat-value" />
        </div>
        <div className="stat">
          <span className="stat-label">{t.cashbackSaved}</span>
          <Money value={s.cashback} className="stat-value good" />
        </div>
      </div>

      {s.total > 0 && (
        <div className="dutch">
          <Press className={`btn wide ${h.dutch ? 'primary' : 'secondary'}`} onClick={toggleDutch}>
            <m.span
              key={String(h.dutch)}
              className="flag"
              initial={{ rotate: -25, scale: 0.4 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={jelly}
            >
              <FlagNL />
            </m.span>
            {h.dutch ? t.goingDutch(tenge(s.each)) : t.goDutch}
          </Press>
          <p className="muted small dutch-note">{t.dutchNote}</p>
        </div>
      )}

      {s.total > 0 && (
        <>
          <div className="group-title">{t.balances}</div>
          <div className="card rows">
            {[...s.people]
              .sort((a, b) => b.balance - a.balance)
              .map((p) => (
                <div key={p.id} className="row static">
                  <Avatar person={friends[p.id]} size={36} />
                  <span className="row-main">
                    <span className="row-title">{friends[p.id].name}</span>
                    <span className="row-sub">
                      {t.spent(tenge(p.spent))}
                      {p.paid > 0 && ` · ${t.paid(tenge(p.paid))}`}
                      {p.cashback >= 1 && ` · ${t.cashbackOf(tenge(p.cashback))}`}
                    </span>
                  </span>
                  <span className={`bal num ${Math.round(p.balance) > 0 ? 'pos' : Math.round(p.balance) < 0 ? 'neg' : ''}`}>
                    {Math.round(p.balance) > 0 ? '+' : ''}
                    {fmt(p.balance)}
                  </span>
                </div>
              ))}
          </div>

          <div className="group-title">{t.chatMessage}</div>
          <div className="card pad">
            {!h.dutch && <Switch label={t.whoSpent} on={breakdown} onChange={setBreakdown} />}
            <pre className="msg">{msg}</pre>
            <div className="row-btns">
              <Press className="btn primary" onClick={copy}>
                <IconCopy /> {t.copy}
              </Press>
              {'share' in navigator && (
                <Press className="btn secondary" onClick={share}>
                  <IconShare /> {t.share}
                </Press>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function TransferRow({ tr, i, friends }: { tr: Transfer; i: number; friends: Record<string, Person> }) {
  const from = friends[tr.from]
  const to = friends[tr.to]
  return (
    <div className="slip-line">
      <m.div
        className="transfer"
        initial={{ y: '-105%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 520, damping: 34, delay: 0.06 + i * 0.04 }}
      >
        <span className="pair">
          <Avatar person={from} size={28} />
          <Avatar person={to} size={28} />
        </span>
        <span className="tr-who">
          <b>{from.name}</b>
          <span className="tr-arrow">→</span>
          <b>{to.name}</b>
        </span>
        <span className="tr-amt num">{tenge(tr.amount)}</span>
      </m.div>
    </div>
  )
}
