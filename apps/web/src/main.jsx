import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initAnalytics } from './analytics.js'

initAnalytics()

// No router dependency for a couple of extra pages (Mission 14 — espace
// admin ; Mission 23 — accueil public, styleguide interne, espace
// étudiant) -- a plain pathname check, consistent with how the rest of
// the app already hand-rolls its own screen state machine instead of
// pulling in a library.
const path = window.location.pathname

// Lazy pour toutes les zones -- loading on demand keeps each out of the
// bundle for every OTHER path (DESIGN-SYSTEM §7 budget: "chargé à la
// demande"). App.jsx (terminal libre, Terminal.jsx/@simulateur/core/data)
// et AdminApp.jsx étaient encore importés statiquement jusqu'au
// 08/10/2026 (Mission 23 Étape 3) -- ils gonflaient le bundle de l'accueil
// de tout le poids du simulateur alors que personne ne les charge sur "/".
// Corrigé pour de bon ici : chaque route a maintenant son propre chunk.
const StyleguidePage = lazy(() => import('./platform/StyleguidePage.jsx'))
const PlatformApp = lazy(() => import('./platform/PlatformApp.jsx'))
const HomePage = lazy(() => import('./platform/HomePage.jsx'))
const App = lazy(() => import('./App.jsx'))
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

// Mission 23 (reprise Étape 2, 07/10/2026) : la nouvelle page d'accueil
// publique remplace l'ancien onboarding à "/" (docs/MAQUETTES.md §1 :
// "l'écran le plus important"). L'ancien parcours (Onboarding ->
// AccessGate -> Terminal, Mission 06) reste intact et testé, déplacé à
// "/simulateur" -- jamais supprimé, juste plus avancé depuis l'accueil :
// le terminal doit rester joignable tant que l'Étape 3 ne l'a pas
// intégré comme leçon de la vraie formation. Décision consignée dans
// TASKS.md (pas un oubli des suites e2e historiques, qui pointent
// maintenant vers /simulateur).
const RootComponent = path.startsWith('/admin')
  ? AdminApp
  : path.startsWith('/styleguide')
    ? StyleguidePage
    : path.startsWith('/app')
      ? PlatformApp
      : path.startsWith('/simulateur')
        ? App
        : HomePage

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>
      <RootComponent />
    </Suspense>
  </StrictMode>,
)
