import { useRef, useState } from "react";
import Terminal from "./Terminal.jsx";
import { navigate } from "./platform/useRoute.js";
import { useLang } from "./i18n/useLang.js";
import { dictionary } from "./i18n/dictionary.js";

// PROMPT-PASSE-ACCUEIL.md chantier 1 (14/10/2026) : démonstration limitée du
// terminal depuis l'accueil (option A tranchée par Massy). Monte le VRAI
// Terminal.jsx -- jamais une imitation -- sans compte ni clé de licence.
//
// Contrainte la plus importante de ce fichier : ne JAMAIS modifier
// Terminal.jsx. Tout ce qui suit observe le terminal depuis l'extérieur,
// par les mêmes mécanismes qu'un vrai utilisateur (événements DOM réels sur
// son <input>, sa seule référence impérative `getState()`) -- jamais par un
// prop ou un comportement ajouté à Terminal lui-même.
//
// Séquence de référence (mêmes commandes que le test e2e "full happy path",
// apps/web/e2e/terminal.spec.js) : AN -> SS -> NM -> AP -> RF -> ER. "Trois
// commandes d'exemple" (demande du prompt) est donc une fenêtre glissante
// de 3 commandes sur ces 6 étapes, pas une liste figée -- sans ça, personne
// n'irait au bout d'un PNR complet avec seulement 3 aides fixes.
const SCRIPT = ["AN26DECALGPAR", "SS1Y1", "NM1DOE/JOHN MR", "AP123456", "RFTEST", "ER"];
const HINT_WINDOW = 3;
const MAX_DEMO_COMMANDS = 15;

// "Le compteur vit en localStorage" (demande explicite) : pas remis à zéro
// à chaque visite de /demo, pour ne pas récompenser un simple F5 -- mais ce
// n'est PAS un dispositif anti-fraude (demande explicite aussi) : vider son
// navigateur recommence le compteur à zéro, et c'est très bien ainsi. Ne
// JAMAIS faire évoluer ceci vers quelque chose de plus strict.
const DEMO_COUNT_KEY = "simulateur-amadeus:demo-command-count";

function readStoredCount() {
  const raw = Number.parseInt(localStorage.getItem(DEMO_COUNT_KEY) || "0", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

// Insère une commande dans le vrai <input> de Terminal.jsx comme si elle
// avait été tapée -- jamais en modifiant Terminal.jsx pour accepter une
// valeur externe. Le "setter natif" contourne le patch de React sur
// HTMLInputElement.value (nécessaire pour qu'un <input> contrôlé par React
// remarque un changement fait depuis l'extérieur) ; l'événement "input" qui
// suit est ce que React écoute réellement pour déclencher le `onChange` de
// Terminal -- exactement le even qu'un vrai clavier aurait émis.
function insertCommand(container, cmd) {
  const el = container?.querySelector(".prompt-input");
  if (!el) return;
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  nativeSetter.call(el, cmd);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
  el.setSelectionRange(cmd.length, cmd.length);
  el.dispatchEvent(new Event("select", { bubbles: true }));
}

export default function DemoTerminalPage() {
  const [lang] = useLang();
  const t = dictionary[lang];
  const td = t.platform.demo;

  const containerRef = useRef(null);
  const terminalRef = useRef(null);
  const lastValueRef = useRef("");
  const [scriptPos, setScriptPos] = useState(0);
  const [complete, setComplete] = useState(() => readStoredCount() >= MAX_DEMO_COMMANDS);

  function handleChange(event) {
    if (event.target?.classList?.contains("prompt-input")) {
      lastValueRef.current = event.target.value;
    }
  }

  function handleKeyDown(event) {
    if (event.key !== "Enter" || !event.target?.classList?.contains("prompt-input")) return;

    const typed = lastValueRef.current.trim().toUpperCase();
    if (typed && typed === SCRIPT[scriptPos]) {
      setScriptPos((pos) => Math.min(pos + 1, SCRIPT.length));
    }

    const next = readStoredCount() + 1;
    localStorage.setItem(DEMO_COUNT_KEY, String(next));
    if (next >= MAX_DEMO_COMMANDS) setComplete(true);

    // processCommand() est asynchrone (certaines commandes chargent des
    // données) -- un court délai avant de lire l'état réel du moteur,
    // plutôt qu'un couplage direct à sa promesse (que Terminal.jsx
    // n'expose pas, et ne doit pas exposer).
    setTimeout(() => {
      const state = terminalRef.current?.getState?.();
      if (state?.activePNR?.recordLocator) setComplete(true);
    }, 150);
  }

  const hints = complete ? [] : SCRIPT.slice(scriptPos, scriptPos + HINT_WINDOW);

  return (
    <div className="demo-page" ref={containerRef} onKeyDown={handleKeyDown} onChange={handleChange}>
      {hints.length > 0 && (
        <div className="demo-hints">
          <span className="demo-hints-label">{td.hint}</span>
          {hints.map((cmd) => (
            <button
              key={cmd}
              type="button"
              className="demo-hint-chip"
              onClick={() => insertCommand(containerRef.current, cmd)}
            >
              {cmd}
            </button>
          ))}
        </div>
      )}
      <Terminal ref={terminalRef} />
      {complete && (
        <div className="demo-complete-overlay">
          <div className="demo-complete-card">
            <h2>{td.completeTitle}</h2>
            <p>{td.completeBody}</p>
            <button type="button" className="demo-complete-cta" onClick={() => navigate("/app/inscription")}>
              {td.completeCta}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
