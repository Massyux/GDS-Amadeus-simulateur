/**
 * DESIGN-SYSTEM §5: "toujours accompagnée d'un texte ... jamais seule."
 * The fill transitions via `transform: scaleX()`, never `width` (§6: only
 * opacity/transform may be animated).
 *
 * @param {{ value: number, max?: number, label: string }} props
 */
export function ProgressBar({ value, max = 100, label }) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

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
        <div className="pf-progress-fill" style={{ transform: `scaleX(${pct})` }} />
      </div>
      <p className="pf-progress-label">{label}</p>
    </div>
  );
}
