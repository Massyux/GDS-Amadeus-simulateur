// "Ajouter à mon agenda" pour les leçons de type live (MISSION-23.md
// Architecture : "fichier .ics, pas d'intégration tierce"). Blob généré
// côté client, pas de dépendance -- le format .ics est juste du texte.
function pad(n) {
  return String(n).padStart(2, "0");
}

function formatIcsDate(date) {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function escapeIcsText(text) {
  return String(text || "").replace(/[,;]/g, (c) => `\\${c}`);
}

export function buildIcsUrl({ title, startsAt, durationMinutes, link }) {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + (durationMinutes || 60) * 60 * 1000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@gds-amadeus-simulateur`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    link ? `DESCRIPTION:${escapeIcsText(link)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  return URL.createObjectURL(blob);
}
