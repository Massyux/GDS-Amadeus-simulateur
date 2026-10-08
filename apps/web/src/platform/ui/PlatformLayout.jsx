import { useState } from "react";
import "../styles/platform.css";
import { Brand } from "../Brand.jsx";

/**
 * Page shell authentifiée (espace étudiant) — barre en verre dépoli,
 * conteneur 1200px, menu mobile coulissant sous 768px, atmosphère de fond
 * (docs/DESIGN-SYSTEM.md §2 : trois halos + grille, obligatoire partout).
 * Tout vit sous `.platform-root` pour ne jamais fuiter vers le terminal/
 * onboarding/admin existants (apps/web/src/index.css), qui restent
 * strictement identiques (CLAUDE.md, CONSTITUTION §3).
 *
 * La page d'accueil publique (HomePage.jsx) a sa propre barre (liens et
 * structure différents, docs/MAQUETTES.md §1) mais réutilise la même
 * atmosphère -- voir Atmosphere.jsx.
 *
 * @param {{
 *   nav?: import("react").ReactNode,
 *   menuLabels?: { open: string, close: string },
 *   children: import("react").ReactNode,
 * }} props
 */
export function PlatformLayout({ nav, menuLabels, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const openLabel = menuLabels?.open ?? "Open menu";
  const closeLabel = menuLabels?.close ?? "Close menu";

  return (
    <div className="platform-root">
      <Atmosphere />
      <header className="pf-topbar">
        <div className="pf-topbar-inner">
          <Brand />
          {nav && <nav className="pf-topbar-nav--desktop">{nav}</nav>}
          {nav && (
            <button
              type="button"
              className="pf-topbar-menu-btn"
              aria-expanded={menuOpen}
              aria-controls="pf-mobile-nav"
              aria-label={menuOpen ? closeLabel : openLabel}
              onClick={() => setMenuOpen((open) => !open)}
            >
              ☰
            </button>
          )}
        </div>
        {nav && menuOpen && (
          <nav id="pf-mobile-nav" className="pf-topbar-nav--mobile">
            {nav}
          </nav>
        )}
      </header>
      <main className="pf-container">{children}</main>
    </div>
  );
}

export function Atmosphere() {
  return (
    <>
      <div className="pf-atmosphere" aria-hidden="true">
        <i className="pf-halo-1" />
        <i className="pf-halo-2" />
        <i className="pf-halo-3" />
      </div>
      <div className="pf-gridbg" aria-hidden="true" />
    </>
  );
}
