const CONTACT_EMAIL = "massinissa.mehdani@gmail.com";
const APP_VERSION = "1.0.0-pilot";

// Discreet feedback channel (missions/MISSION-07.md Partie A): a mailto
// with the app version and current screen pre-filled in the subject, so
// Massy can tell at a glance where a report came from without the pilot
// having to type it.
export default function FeedbackButton({ t, screen }) {
  const subject = `[Simulateur Amadeus GDS ${APP_VERSION}] Feedback (${screen})`;
  return (
    <a
      className="feedback-button"
      href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`}
      title={t.feedback.title}
    >
      {t.feedback.label}
    </a>
  );
}
