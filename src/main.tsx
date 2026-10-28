import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LazyMotion, MotionConfig, domMax } from 'motion/react'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { initNav } from './nav'
import './styles.css'

registerSW({ immediate: true })
initNav()

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
