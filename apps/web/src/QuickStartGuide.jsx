import { useState } from "react";

// Quick start guide (missions/MISSION-07.md Partie A): reachable from both
// the homepage and the terminal via a discreet "?" button. Self-contained
// (owns its own open/closed state) so callers just render <QuickStartGuide
// t={t} /> without extra plumbing. Printable via window.print() -- the
// print stylesheet (index.css @media print) hides everything else.
export default function QuickStartGuide({ t }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="quickstart-trigger"
        title={t.quickStart.triggerLabel}
        aria-label={t.quickStart.triggerLabel}
        onClick={() => setOpen(true)}
      >
        {t.quickStart.trigger}
      </button>

      {open && (
        <div className="quickstart-backdrop" onClick={() => setOpen(false)}>
          <div
            className="quickstart-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t.quickStart.title}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="quickstart-header">
              <h2 className="quickstart-title">{t.quickStart.title}</h2>
              <div className="quickstart-header-actions">
                <button
                  type="button"
                  className="quickstart-print"
                  onClick={() => window.print()}
                >
                  {t.quickStart.print}
                </button>
                <button
                  type="button"
                  className="quickstart-close"
                  onClick={() => setOpen(false)}
                >
                  {t.quickStart.close}
                </button>
              </div>
            </div>

            <h3 className="quickstart-section-title">{t.quickStart.basicsTitle}</h3>
            <dl className="quickstart-basics">
              {t.quickStart.basics.map(([command, description]) => (
                <div className="quickstart-basics-row" key={command}>
                  <dt>{command}</dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>

            <h3 className="quickstart-section-title">{t.quickStart.sequenceTitle}</h3>
            <ol className="quickstart-sequence">
              {t.quickStart.sequence.map((line) => (
                <li key={line}>
                  <code>{line}</code>
                </li>
              ))}
            </ol>

            <p className="quickstart-note">{t.quickStart.note}</p>
          </div>
        </div>
      )}
    </>
  );
}
