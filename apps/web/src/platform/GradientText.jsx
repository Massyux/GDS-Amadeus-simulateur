// Dégradé cyan→corail, règle unique (docs/DESIGN-SYSTEM.md §5 bis) : jamais
// sur un paragraphe ni un bouton, seulement la deuxième ligne du h1
// d'accueil, le dernier mot (ou groupe de mots) de chaque h2 de section, et
// les chiffres clés. Générique plutôt que des clés de dictionnaire pré-
// coupées : fonctionne pareil en FR et en EN sans dupliquer chaque titre,
// `words` ajuste combien de mots finaux portent le dégradé quand le défaut
// (le dernier) coupe mal (ponctuation finale détachée par un espace).
export function GradientTail({ text, words = 1 }) {
  const parts = text.trim().split(/\s+/);
  if (parts.length <= words) {
    return <em className="pf-grad">{text}</em>;
  }
  const lead = parts.slice(0, parts.length - words).join(" ");
  const tail = parts.slice(parts.length - words).join(" ");
  return (
    <>
      {lead} <em className="pf-grad">{tail}</em>
    </>
  );
}
