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

const LESSON_ROUTE = /^\/app\/cours\/([^/]+)\/lecon\/(\d+)$/;
const COURSE_ROUTE = /^\/app\/cours\/([^/]+)$/;

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

  if (authState === "anon") {
    return <AuthScreen t={t} lang={lang} onChangeLang={setLang} onAuthenticated={handleAuthenticated} />;
  }

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

  if (route.pathname === "/app/compte") {
    return <AccountPage t={t} lang={lang} onChangeLang={setLang} user={user} onLogout={handleLogout} />;
  }

  return <CataloguePage t={t} lang={lang} onChangeLang={setLang} user={user} onLogout={handleLogout} />;
}
