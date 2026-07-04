export default function Onboarding({ onEnter }) {
  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <h1 className="onboarding-title">Simulateur Amadeus GDS</h1>
        <p className="onboarding-tagline">
          Terminal de réservation pédagogique, hors-ligne, qui reproduit le
          fonctionnement d'un GDS de type Amadeus Selling Platform : mêmes
          commandes, mêmes séquences, mêmes erreurs.
        </p>
        <ul className="onboarding-tips">
          <li>
            <code>HE</code> ou <code>HELP</code> — liste des commandes
          </li>
          <li>
            <code>AN26DECALGPAR</code> — disponibilité ALG → PAR le 26 déc.
          </li>
          <li>
            <code>SS1Y1</code> — vendre une place depuis le dernier AN
          </li>
        </ul>
        <button className="onboarding-enter" onClick={onEnter} autoFocus>
          Entrer dans le terminal
        </button>
        <p className="onboarding-disclaimer">
          Projet indépendant à but pédagogique, non affilié à Amadeus IT
          Group.
        </p>
      </div>
    </div>
  );
}
