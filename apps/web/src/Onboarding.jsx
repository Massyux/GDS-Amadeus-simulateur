const CONTACT_EMAIL = "massinissa.mehdani@gmail.com";

// Static, real-rendered (not a screenshot) sample of what the terminal looks
// like: reuses the same CSS classes as Terminal.jsx but is purely decorative
// — no input, no engine call — so it can be shown before an access key is
// validated without exposing the actual terminal.
const PREVIEW_LINES = [
  ">AN15DECALGPAR",
  "** AMADEUS AVAILABILITY - AN ** ALG PAR 1200",
  " 1 AT 100 J9 C9 Y9 B9 M9  ALG 0800 PAR 1000",
  " 2 SV 200 J4 C4 Y9 B9 M9  ALG 1400 PAR 1615",
  ">SS1Y1",
  " 1 AT 100 Y1  ALG PAR SS1  15DEC",
];

export default function Onboarding({ t, lang, onChangeLang, onHaveKey }) {
  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-langs">
          <button
            className={`onboarding-lang${lang === "fr" ? " active" : ""}`}
            type="button"
            onClick={() => onChangeLang("fr")}
          >
            {t.lang.fr}
          </button>
          <button
            className={`onboarding-lang${lang === "en" ? " active" : ""}`}
            type="button"
            onClick={() => onChangeLang("en")}
          >
            {t.lang.en}
          </button>
        </div>

        <h1 className="onboarding-title">{t.onboarding.title}</h1>
        <p className="onboarding-tagline">{t.onboarding.valueProp}</p>
        <p className="onboarding-audience">{t.onboarding.audience}</p>

        <p className="onboarding-preview-label">{t.onboarding.previewLabel}</p>
        <div className="terminal-preview" aria-hidden="true">
          {PREVIEW_LINES.map((line, index) => (
            <div className="line" key={index}>
              {line}
            </div>
          ))}
          <span className="caret-block" />
        </div>

        <div className="onboarding-actions">
          <button className="onboarding-enter" type="button" onClick={onHaveKey} autoFocus>
            {t.onboarding.ctaHaveKey}
          </button>
          <a
            className="onboarding-request"
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
              "Demande d'accès - Simulateur Amadeus GDS"
            )}`}
          >
            {t.onboarding.ctaRequestAccess}
          </a>
        </div>

        <p className="onboarding-disclaimer">{t.onboarding.disclaimer}</p>
      </div>
    </div>
  );
}
