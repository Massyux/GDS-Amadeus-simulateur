import { useEffect, useRef, useState } from "react";

// Terminal en démonstration animée (docs/MAQUETTES.md §1 : "une vraie
// séquence qui se tape toute seule en boucle ... Non négociable"). Pur
// CSS/JS, aucune dépendance -- un setTimeout qui révèle la séquence
// caractère par caractère, boucle, respecte prefers-reduced-motion (montre
// l'état final statique plutôt que d'animer -- DESIGN-SYSTEM §6).
//
// La séquence est un sous-ensemble de scénarios réellement supportés par
// packages/core (AN -> SS -> NM -> ER), pas une invention graphique : ce que
// le terminal montre ici, le vrai simulateur le fait identiquement.
const SEQUENCE = [
  { cmd: "AN15DECALGPAR" },
  { line: "  1  AH1006  Y9 C4   ALG CDG  0810 1120" },
  { line: "  2  AF1655  Y7 C2   ALG CDG  1340 1655" },
  { line: "  3  AH1008  Y4 C0   ALG CDG  1820 2130" },
  { cmd: "SS1Y1" },
  { line: "  SEGMENT VENDU — 1 PLACE", strong: true },
  { cmd: "NM1DUPONT/JEAN MR" },
  { cmd: "ER" },
  { line: "  DOSSIER ENREGISTRÉ — 4KX9TZ", strong: true },
];

const TYPE_MS = 28;
const LINE_PAUSE_MS = 220;
const CMD_PAUSE_MS = 480;
const END_PAUSE_MS = 3200;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function TerminalDemo({ label }) {
  const [revealed, setRevealed] = useState(() => (prefersReducedMotion() ? SEQUENCE.length : 0));
  const [typingLen, setTypingLen] = useState(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    let cancelled = false;
    let step = 0;

    function scheduleNext(delay) {
      timeoutRef.current = setTimeout(run, delay);
    }

    function run() {
      if (cancelled) return;
      if (step >= SEQUENCE.length) {
        scheduleNext(END_PAUSE_MS);
        step = 0;
        setRevealed(0);
        setTypingLen(0);
        return;
      }
      const entry = SEQUENCE[step];
      const text = entry.cmd ?? entry.line;
      let pos = 0;
      setRevealed(step);

      function typeChar() {
        if (cancelled) return;
        pos += 1;
        setTypingLen(pos);
        if (pos < text.length) {
          timeoutRef.current = setTimeout(typeChar, TYPE_MS);
        } else {
          setRevealed(step + 1);
          setTypingLen(0);
          step += 1;
          scheduleNext(entry.cmd ? CMD_PAUSE_MS : LINE_PAUSE_MS);
        }
      }

      typeChar();
    }

    scheduleNext(500);

    return () => {
      cancelled = true;
      clearTimeout(timeoutRef.current);
    };
  }, []);

  const reduced = prefersReducedMotion();
  const currentText = SEQUENCE[revealed]?.cmd ?? SEQUENCE[revealed]?.line ?? "";
  const isTypingCommand = !reduced && SEQUENCE[revealed]?.cmd !== undefined;

  return (
    <div className="pf-termwrap">
      <div className="pf-termglow" aria-hidden="true" />
      <div className="pf-term" role="img" aria-label="Démonstration du terminal de réservation">
        <div className="pf-tbar">
          <i /><i /><i />
          <span>{label}</span>
        </div>
        <div className="pf-tbody">
          {SEQUENCE.slice(0, revealed).map((entry, i) =>
            entry.cmd ? (
              <div key={i}>
                <span className="pf-cmd">&gt; {entry.cmd}</span>
              </div>
            ) : (
              <div key={i} className={entry.strong ? "pf-hl" : undefined}>
                {entry.line}
              </div>
            )
          )}
          {!reduced && revealed < SEQUENCE.length && (
            <div>
              {isTypingCommand ? (
                <span className="pf-cmd">&gt; {currentText.slice(0, typingLen)}</span>
              ) : (
                <span className={SEQUENCE[revealed]?.strong ? "pf-hl" : undefined}>
                  {currentText.slice(0, typingLen)}
                </span>
              )}
              <span className="pf-cur" />
            </div>
          )}
          {(reduced || revealed >= SEQUENCE.length) && (
            <div>
              <span className="pf-cmd">
                &gt; <span className="pf-cur" />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
