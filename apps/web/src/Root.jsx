import { lazy, useEffect, useState } from 'react'

// Lazy pour toutes les zones -- loading on demand keeps each out of the
// bundle for every OTHER path (DESIGN-SYSTEM §7 budget: "chargé à la
// demande"). Voir l'historique dans main.jsx : App.jsx et AdminApp.jsx
// étaient encore importés statiquement jusqu'au 08/10/2026.
const StyleguidePage = lazy(() => import('./platform/StyleguidePage.jsx'))
const PlatformApp = lazy(() => import('./platform/PlatformApp.jsx'))
const HomePage = lazy(() => import('./platform/HomePage.jsx'))
const App = lazy(() => import('./App.jsx'))
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const NotFoundPage = lazy(() => import('./platform/NotFoundPage.jsx'))
const DemoTerminalPage = lazy(() => import('./DemoTerminalPage.jsx'))
const LegalPendingPage = lazy(() => import('./platform/LegalPendingPage.jsx'))

// 🔴 Bug critique constaté en production le 11/10/2026 : le choix de racine
// n'était fait qu'UNE FOIS, à l'import du module, à partir de
// `window.location.pathname`. `navigate()` (platform/useRoute.js) fait un
// vrai `history.pushState` + émet un `popstate` -- mais rien ici n'écoutait
// cet événement. Résultat : cliquer "Commencer" changeait l'URL vers `/app`
// sans jamais démonter l'accueil ni monter la plateforme -- un cul-de-sac
// depuis la toute première page du site. `useRoute.js` fonctionnait très
// bien pour la navigation INTERNE à `/app/*` (c'est son propre composant
// qui s'abonne à `popstate`) ; il manquait l'équivalent ici, au sommet, pour
// franchir la frontière entre les cinq racines (accueil / plateforme /
// admin / simulateur libre / styleguide) -- y compris via les boutons
// précédent/suivant du navigateur, qui déclenchent `popstate` nativement.
//
// Chaque branche reste montée au premier niveau, jamais imbriquée dans une
// autre (règle absolue de Massy : Terminal.jsx ne doit jamais se retrouver
// sous `.platform-root`, sous peine d'hériter de ses styles -- voir
// platform/LessonSimulatorView.jsx). D'où des `return` conditionnels
// directs sur les composants lazy ci-dessus, plutôt qu'une variable
// intermédiaire choisie puis rendue -- `react-hooks/static-components`
// (ESLint) interdit ce second motif : il ne peut pas prouver statiquement
// qu'une référence de composant stockée dans une variable reste stable
// entre deux rendus, même quand -- comme ici -- elle ne pointe jamais que
// vers une des cinq constantes ci-dessus.
export default function Root() {
  const [pathname, setPathname] = useState(() => window.location.pathname)

  useEffect(() => {
    function onPopState() {
      setPathname(window.location.pathname)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  if (pathname === '/') return <HomePage />
  if (pathname.startsWith('/admin')) return <AdminApp />
  if (pathname.startsWith('/styleguide')) return <StyleguidePage />
  if (pathname.startsWith('/app')) return <PlatformApp />
  if (pathname.startsWith('/simulateur')) return <App />
  if (pathname.startsWith('/demo')) return <DemoTerminalPage />
  if (pathname.startsWith('/conditions')) return <LegalPendingPage page="terms" />
  if (pathname.startsWith('/remboursement')) return <LegalPendingPage page="refund" />
  return <NotFoundPage />
}
