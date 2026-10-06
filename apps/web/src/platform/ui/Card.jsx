/**
 * DESIGN-SYSTEM §5: "Maximum 3 informations par carte" -- a content rule
 * for callers to respect, not something a generic container can enforce.
 *
 * @param {{ hoverable?: boolean, className?: string, children: import("react").ReactNode }
 *   & import("react").HTMLAttributes<HTMLDivElement>} props
 */
export function Card({ hoverable = false, className = "", children, ...rest }) {
  const classes = ["pf-card", hoverable ? "pf-card--hoverable" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
