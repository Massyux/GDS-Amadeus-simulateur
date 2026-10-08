/**
 * `color` (chantier 3, couleur par formation) permet à un badge de reprendre
 * la teinte d'identification d'une formation précise plutôt qu'un `tone`
 * générique -- la coquille du site reste neutre, c'est le contenu qui
 * porte la couleur.
 *
 * @param {{ tone?: "accent"|"warning"|"danger"|"info"|"neutral", color?: string, children: import("react").ReactNode }} props
 */
export function Badge({ tone = "accent", color, children }) {
  const toneClass = tone === "accent" ? "" : ` pf-badge--${tone}`;
  const style = color ? { background: `${color}1F`, color } : undefined;
  return (
    <span className={`pf-badge${toneClass}`} style={style}>
      {children}
    </span>
  );
}
