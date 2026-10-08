import { useState } from "react";

/**
 * @param {{
 *   variant?: "primary"|"secondary"|"discreet"|"danger",
 *   size?: "sm"|"md"|"lg",
 *   confirmLabel?: string,
 *   className?: string,
 *   children: import("react").ReactNode,
 *   onClick?: (event: import("react").MouseEvent) => void,
 * } & import("react").ButtonHTMLAttributes<HTMLButtonElement>} props
 *
 * Trois tailles seulement (DESIGN-SYSTEM §5 bis) : `sm` 34px (dans une carte,
 * une ligne de tableau), `md` 38px (barre de navigation, formulaires --
 * défaut), `lg` 46px (action principale d'une page). Un secondaire à côté
 * d'un primaire de même `size` a structurellement la même hauteur -- les deux
 * lisent `.pf-btn--{size}` pour cette dimension, jamais pour la couleur.
 *
 * Danger buttons require confirmation before firing (DESIGN-SYSTEM §5:
 * "réservé aux suppressions, avec confirmation obligatoire") -- enforced
 * here once, structurally, rather than left to every future caller
 * (Étape 4's admin back-office deletes licenses/courses/lessons) to
 * remember. Pass `confirmLabel` to opt in; a danger button without it
 * fires immediately (e.g. "annuler" actions that aren't destructive).
 */
export function Button({
  variant = "secondary",
  size = "md",
  confirmLabel,
  children,
  onClick,
  className = "",
  ...rest
}) {
  const [confirming, setConfirming] = useState(false);

  const classes = ["pf-btn", `pf-btn--${variant}`, `pf-btn--${size}`, className]
    .filter(Boolean)
    .join(" ");

  if (variant === "danger" && confirmLabel) {
    return (
      <button
        type="button"
        className={classes}
        onClick={(event) => {
          if (confirming) {
            setConfirming(false);
            onClick?.(event);
          } else {
            setConfirming(true);
          }
        }}
        onBlur={() => setConfirming(false)}
        {...rest}
      >
        {confirming ? confirmLabel : children}
      </button>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}
