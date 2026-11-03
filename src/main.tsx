import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LazyMotion, MotionConfig, domMax } from 'motion/react'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { initNav, openHangout } from './nav'
import { initPrefs } from './prefs'
import { initSync, joinHangout } from './sync'
import { getT } from './i18n'
import { toast } from './ui/toast'
import './styles.css'

registerSW({ immediate: true })

// a shared link looks like /?join=<code>
const join = new URLSearchParams(location.search).get('join')
if (join) history.replaceState(null, '', location.pathname)
initNav()
initPrefs()
initSync()
if (join) void joinHangout(join).then((id) => (id ? openHangout(id) : toast(getT().joinFailed)))

const vv = window.visualViewport
if (vv) {
  const sync = () =>
    document.documentElement.style.setProperty('--kb', `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`)
  vv.addEventListener('resize', sync)
  vv.addEventListener('scroll', sync)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </LazyMotion>
  </StrictMode>,
)
