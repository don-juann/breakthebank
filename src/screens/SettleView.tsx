import { useMemo, useState } from 'react'
import * as m from 'motion/react-m'
import { useStore } from '../store'
import { buildMessage, settle, type Transfer } from '../lib/split'
import { fmt, tenge } from '../lib/money'
import type { Hangout, Person } from '../types'
import { Press } from '../ui/Press'
import { Avatar, Money, Switch, copyText } from '../ui/bits'
import { FlagNL, IconCopy, IconShare } from '../ui/icons'
import { jelly, snappy } from '../ui/motion'
import { toast } from '../ui/toast'
import { useT } from '../i18n'

export function SettleView({ hangout: h }: { hangout: Hangout }) {
  const friends = useStore((s) => s.friends)
  const s = useMemo(() => settle(h, friends), [h, friends])
  const [breakdown, setBreakdown] = useState(true)
  const t = useT()
  const msg = buildMessage(h, friends, s, { breakdown, t })

  const copy = async () => toast((await copyText(msg)) ? t.copied : t.copyFailed)
  const share = () => navigator.share({ text: msg }).catch(() => {})
  const toggleDutch = () => useStore.getState().updateHangout(h.id, { dutch: !h.dutch })

  return (
    <>
      <div className="section-head">
        <h2>{t.settleUp}</h2>
      </div>
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

      {s.skipped > 0 && (
        <div className="warn-card">{t.skipped(s.skipped)}</div>
      )}

      <div className="group-title">{t.transfers}</div>
      {s.transfers.length === 0 ? (
        <div className="card pad all-square">{s.total > 0 ? `✅ ${t.allSquare}` : t.addFirst}</div>
      ) : (
        <div className="list">
          {s.transfers.map((t, i) => (
            <TransferRow key={t.key} t={t} i={i} friends={friends} />
          ))}
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
    </>
  )
}

function TransferRow({ t, i, friends }: { t: Transfer; i: number; friends: Record<string, Person> }) {
  const from = friends[t.from]
  const to = friends[t.to]
  return (
    <m.div
      className="card transfer"
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...snappy, delay: i * 0.05 }}
    >
      <Avatar person={from} size={38} />
      <span className="tr-line">
        <b>{from.name}</b>
        <span className="tr-arrow">→</span>
        <span className="tr-amt num">{tenge(t.amount)}</span>
        <span className="tr-arrow">→</span>
        <b>{to.name}</b>
      </span>
      <Avatar person={to} size={38} />
    </m.div>
  )
}
