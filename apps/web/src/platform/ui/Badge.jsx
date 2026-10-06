/**
 * @param {{ tone?: "accent"|"warning"|"danger"|"info"|"neutral", children: import("react").ReactNode }} props
 */
export function Badge({ tone = "accent", children }) {
  const toneClass = tone === "accent" ? "" : ` pf-badge--${tone}`;
  return <span className={`pf-badge${toneClass}`}>{children}</span>;
}
