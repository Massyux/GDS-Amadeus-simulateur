import { useEffect, useState } from "react";
import { useRoute, navigate } from "./useRoute.js";
import { authApi } from "./api.js";
import { useLang } from "../i18n/useLang.js";
import { dictionary } from "../i18n/dictionary.js";
import AuthScreen from "./AuthScreen.jsx";
import ResetPasswordScreen from "./ResetPasswordScreen.jsx";
import CataloguePage from "./CataloguePage.jsx";
import CoursePage from "./CoursePage.jsx";
import LessonPlayerPage from "./LessonPlayerPage.jsx";
import AccountPage from "./AccountPage.jsx";
import NotFoundPage from "./NotFoundPage.jsx";

const LESSON_ROUTE = /^\/app\/cours\/([^/]+)\/lecon\/(\d+)$/;
const COURSE_ROUTE = /^\/app\/cours\/([^/]+)$/;
const KNOWN_ROUTES = new Set(["/app", "/app/catalogue", "/app/compte", "/app/inscription"]);

/**
 * Point d'entrée de l'espace étudiant (Mission 23 Étape 2), chargé à la
 * demande depuis main.jsx sous /app -- jamais dans le bundle visiteur par
 * défaut. Routeur maison (useRoute.js), pas de framework (DESIGN-SYSTEM §7).
 */
export default function PlatformApp() {
  const [route] = useRoute();
  const [lang, setLang] = useLang();
  const t = dictionary[lang];
  const [authState, setAuthState] = useState("loading"); // loading | anon | authed
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);

  useEffect(() => {
    authApi.me().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        setCsrfToken(data.csrfToken);
        setAuthState("authed");
      } else {
        setAuthState("anon");
      }
    });
  }, []);

  function handleAuthenticated(authedUser, token) {
    setUser(authedUser);
    setCsrfToken(token);
    setAuthState("authed");
    navigate("/app/catalogue");
  }

  async function handleLogout() {
    await authApi.logout(csrfToken);
    setUser(null);
    setCsrfToken(null);
    setAuthState("anon");
    navigate("/app");
  }

  if (route.pathname.startsWith("/app/reinitialiser")) {
    const token = new URLSearchParams(route.search).get("token") || "";
    return <ResetPasswordScreen t={t} token={token} />;
  }

  if (authState === "loading") return null;

  // Rendue publiques le 17/10/2026 (prompt architecte "fiche de formation") :
  // la fiche d'une formation et ses leçons en aperçu gratuit doivent
  // convaincre un visiteur AVANT qu'il ait un compte -- `user`/`csrfToken`
  // valent alors `null`, et CoursePage/LessonPlayerPage s'adaptent (pas de
  // progression suivie pour un anonyme). Testées AVANT le portail de
  // connexion, contrairement à /app/catalogue et /app/compte qui restent
  // derrière ce portail.
  const lessonMatch = route.pathname.match(LESSON_ROUTE);
  if (lessonMatch) {
    return (
      <LessonPlayerPage
        key={lessonMatch[2]}
        t={t}
        lang={lang}
        onChangeLang={setLang}
        user={user}
        csrfToken={csrfToken}
        courseSlugHint={lessonMatch[1]}
        lessonId={Number(lessonMatch[2])}
        onLogout={handleLogout}
      />
    );
  }

  const courseMatch = route.pathname.match(COURSE_ROUTE);
  if (courseMatch) {
    return (
      <CoursePage
        key={courseMatch[1]}
        t={t}
        lang={lang}
        onChangeLang={setLang}
        user={user}
        csrfToken={csrfToken}
        slug={courseMatch[1]}
        onLogout={handleLogout}
      />
    );
  }

  if (authState === "anon") {
    // PROMPT-PASSE-ACCUEIL.md chantier 2 (14/10/2026) : /app/inscription
    // ouvre AuthScreen directement en mode "register" -- "Commencer" menait
    // jusqu'ici à la connexion alors que le visiteur n'a pas de compte. Le
    // lien "Connexion" de la barre de navigation continue de mener à /app
    // (mode "login" par défaut) : ne pas confondre les deux.
    const initialMode = route.pathname === "/app/inscription" ? "register" : "login";
    return (
      <AuthScreen t={t} lang={lang} onChangeLang={setLang} onAuthenticated={handleAuthenticated} initialMode={initialMode} />
    );
  }

  if (route.pathname === "/app/compte") {
    return <AccountPage t={t} lang={lang} onChangeLang={setLang} user={user} onLogout={handleLogout} />;
  }

  // 🔴 Bug critique du 11/10/2026 : ce `return` était inconditionnel -- une
  // sous-route inconnue sous /app/* (ex. /app/nimportequoi) retombait en
  // silence sur le catalogue au lieu de dire clairement "introuvable".
  if (KNOWN_ROUTES.has(route.pathname)) {
    return <CataloguePage t={t} lang={lang} onChangeLang={setLang} user={user} onLogout={handleLogout} />;
  }

  return <NotFoundPage t={t} />;
}
