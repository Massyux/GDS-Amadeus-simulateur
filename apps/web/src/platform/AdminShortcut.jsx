import { Link } from "./Link.jsx";

// Même clé que admin/AdminApp.jsx -- sessionStorage, jamais localStorage
// (fermer l'onglet déconnecte Massy). Lue ici en lecture seule : ce
// composant ne gère pas la session, il affiche juste un raccourci quand
// elle existe déjà.
const SESSION_KEY = "simulateur-amadeus:admin-token";

// PROMPT-PASSE-ACCUEIL.md chantier 1 (17/10/2026) : "une fois une session
// admin ouverte, un raccourci visible en barre de navigation permet à Massy
// d'y revenir sans retaper quoi que ce soit." Discret (même style que les
// autres liens de navigation) -- jamais un bouton d'appel à l'action, et
// invisible pour tout le monde d'autre que lui (pas de session = pas de
// lien). Le texte visible ne porte jamais le chemin technique "/admin"
// (règle du prompt, voir aussi le lien de pied de page sur HomePage.jsx).
export function AdminShortcut({ label, className = "pf-btn pf-btn--discreet" }) {
  let hasSession = false;
  try {
    hasSession = Boolean(sessionStorage.getItem(SESSION_KEY));
  } catch {
    hasSession = false;
  }
  if (!hasSession) return null;
  return (
    <Link to="/admin" className={className}>
      {label}
    </Link>
  );
}
