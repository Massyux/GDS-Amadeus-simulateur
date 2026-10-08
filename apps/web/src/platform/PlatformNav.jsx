import { Link } from "./Link.jsx";

export function PlatformNav({ t, lang, onChangeLang, user, onLogout }) {
  const tn = t.platform.nav;
  return (
    <>
      {user && (
        <>
          <Link to="/app/catalogue" className="pf-btn pf-btn--discreet">
            {tn.catalogue}
          </Link>
          <Link to="/app/compte" className="pf-btn pf-btn--discreet">
            {tn.account}
          </Link>
        </>
      )}
      {onChangeLang && (
        <span style={{ display: "inline-flex", gap: "4px" }}>
          <button
            type="button"
            className="pf-btn pf-btn--discreet"
            aria-current={lang === "fr" || undefined}
            onClick={() => onChangeLang("fr")}
          >
            {t.lang.fr}
          </button>
          <button
            type="button"
            className="pf-btn pf-btn--discreet"
            aria-current={lang === "en" || undefined}
            onClick={() => onChangeLang("en")}
          >
            {t.lang.en}
          </button>
        </span>
      )}
      {user && (
        <button type="button" className="pf-btn pf-btn--discreet" onClick={onLogout}>
          {tn.logout}
        </button>
      )}
    </>
  );
}
