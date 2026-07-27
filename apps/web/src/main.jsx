import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AdminApp from './admin/AdminApp.jsx'
import { initAnalytics } from './analytics.js'

initAnalytics()

// No router dependency for one extra page (Mission 14 — espace admin) --
// a plain pathname check, consistent with how the rest of the app already
// hand-rolls its own screen state machine instead of pulling in a library.
const RootComponent = window.location.pathname.startsWith('/admin') ? AdminApp : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>,
)
