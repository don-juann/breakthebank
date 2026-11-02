import * as m from 'motion/react-m'
import { usePrefs, type Lang } from '../prefs'
import { PALETTES } from '../palettes'
import { useT } from '../i18n'
import { Press } from '../ui/Press'
import { Sheet } from '../ui/Sheet'
import { jelly } from '../ui/motion'

const LANGS: [Lang, string][] = [
  ['en', 'English'],
  ['kz', 'Қазақша'],
]

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { palette, lang, set } = usePrefs()
  const t = useT()
  return (
    <Sheet open={open} onClose={onClose} title={t.settings}>
      <div className="label">{t.language}</div>
      <div className="chips">
        {LANGS.map(([k, label]) => (
          <Press key={k} round className={`chip ${lang === k ? 'on' : ''}`} onClick={() => set({ lang: k })}>
            {label}
          </Press>
        ))}
      </div>
      <div className="label">{t.colors}</div>
      <div className="palettes">
        {PALETTES.map((p) => (
          <Press key={p.key} className={`palette ${palette === p.key ? 'on' : ''}`} onClick={() => set({ palette: p.key })}>
            <span className="swatches">
              {p.swatches.map((c) => (
                <span key={c} style={{ background: c }} />
              ))}
            </span>
            <span className="palette-name">{p.name}</span>
            {palette === p.key && (
              <m.span className="palette-check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={jelly}>
                ✓
              </m.span>
            )}
          </Press>
        ))}
      </div>
    </Sheet>
  )
}
