import { useState } from "react";
import "../styles/platform.css";

/**
 * Page shell shared by every platform screen (DESIGN-SYSTEM §5
 * "Navigation" + §4 "Largeur de contenu"): sticky 56px top bar, 1200px
 * centered container, mobile slide-out nav below 768px. Everything here
 * lives under `.platform-root` so none of it can leak into the existing
 * terminal/onboarding/admin screens (apps/web/src/index.css), which stay
 * untouched.
 *
 * @param {{
 *   logoLabel?: string,
 *   nav?: import("react").ReactNode,
 *   children: import("react").ReactNode,
 * }} props
 */
export function PlatformLayout({ logoLabel = "Simulateur Amadeus", nav, children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="platform-root">
      <header className="pf-topbar">
        <div className="pf-topbar-inner">
          <span className="pf-topbar-brand">{logoLabel}</span>
          {nav && <nav className="pf-topbar-nav--desktop">{nav}</nav>}
          {nav && (
            <button
              type="button"
              className="pf-topbar-menu-btn"
              aria-expanded={menuOpen}
              aria-controls="pf-mobile-nav"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
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
