import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AdminApp from './admin/AdminApp.jsx'
import { initAnalytics } from './analytics.js'

initAnalytics()

// No router dependency for a couple of extra pages (Mission 14 — espace
// admin ; Mission 23 — styleguide interne) -- a plain pathname check,
// consistent with how the rest of the app already hand-rolls its own
// screen state machine instead of pulling in a library.
const path = window.location.pathname

// Lazy: internal-only, never linked from the visitor-facing home screen --
// loading it on demand keeps it out of the default bundle (DESIGN-SYSTEM
// §7 budget: "chargé à la demande", same principle as the simulator).
const StyleguidePage = lazy(() => import('./platform/StyleguidePage.jsx'))

const RootComponent = path.startsWith('/admin')
  ? AdminApp
  : path.startsWith('/styleguide')
    ? StyleguidePage
    : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>
      <RootComponent />
    </Suspense>
  </StrictMode>,
)
