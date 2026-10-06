/**
 * Loading placeholder at the final element's dimensions (DESIGN-SYSTEM §5:
 * "squelettes gris aux dimensions finales ... objectif: zéro saut de mise
 * en page"). Width/height are set once via inline style (layout, not an
 * animated property) -- the shimmer itself only animates `transform`
 * (see platform.css).
 *
 * @param {{ width?: string, height?: string, radius?: string }} props
 */
export function Skeleton({ width = "100%", height = "16px", radius }) {
  return (
    <div
      className="pf-skeleton"
      style={{ width, height, ...(radius ? { borderRadius: radius } : {}) }}
      aria-hidden="true"
    />
  );
}
