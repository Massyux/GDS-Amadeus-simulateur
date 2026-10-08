import { useEffect, useRef, useState } from "react";

/**
 * DESIGN-SYSTEM §5: "toujours accompagnée d'un texte ... jamais seule."
 * The fill transitions via `transform: scaleX()`, never `width` (§6: only
 * opacity/transform may be animated). Part 5 (chantier 4, 08/10/2026) :
 * remplissage animé à l'apparition -- part de 0, rejoint `value/max` une
 * fois monté, `transition` CSS fait le reste (désactivée sous
 * prefers-reduced-motion comme toute animation de platform.css).
 *
 * `accentColor` (chantier 3, couleur par formation) permet à une barre de
 * reprendre la teinte d'identification de SA formation plutôt que le
 * dégradé cyan→corail générique -- optionnel, les barres hors contexte
 * d'une formation précise (position dans une leçon, etc.) gardent le
 * défaut.
 *
 * @param {{ value: number, max?: number, label: string, accentColor?: string }} props
 */
export function ProgressBar({ value, max = 100, label, accentColor }) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const [animatedPct, setAnimatedPct] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    raf.current = requestAnimationFrame(() => setAnimatedPct(pct));
    return () => cancelAnimationFrame(raf.current);
  }, [pct]);

  return (
    <div className="pf-progress">
      <div
        className="pf-progress-track"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className="pf-progress-fill"
          style={{
            transform: `scaleX(${animatedPct})`,
            background: accentColor || undefined,
          }}
        />
      </div>
      <p className="pf-progress-label">{label}</p>
    </div>
  );
}
