/**
 * Text input with a real <label> (DESIGN-SYSTEM §8: "libellés réels sur les
 * champs, pas de simple placeholder") and an error message that says what
 * to do, not just that something is wrong (DESIGN-SYSTEM §5).
 *
 * @param {{
 *   label: string,
 *   id?: string,
 *   error?: string,
 *   hint?: string,
 * } & import("react").InputHTMLAttributes<HTMLInputElement>} props
 */
export function Field({ label, id, error, hint, type = "text", ...rest }) {
  const inputId = id || `pf-field-${slug(label)}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="pf-field">
      <label className="pf-field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        className={`pf-field-input${error ? " pf-field-input--error" : ""}`}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        {...rest}
      />
      {error && (
        <p className="pf-field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="pf-field-hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}

function slug(label) {
  return String(label || "champ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
