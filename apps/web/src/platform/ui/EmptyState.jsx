import { Button } from "./Button.jsx";

/**
 * DESIGN-SYSTEM §5: "jamais une page blanche: une icône discrète, une
 * phrase, un bouton d'action."
 *
 * @param {{
 *   icon?: string,
 *   message: string,
 *   actionLabel?: string,
 *   onAction?: () => void,
 * }} props
 */
export function EmptyState({ icon = "○", message, actionLabel, onAction }) {
  return (
    <div className="pf-empty">
      <div className="pf-empty-icon" aria-hidden="true">
        {icon}
      </div>
      <p className="pf-empty-message">{message}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
