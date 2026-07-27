import { useState } from "react";
import AdminLogin from "./AdminLogin.jsx";
import AdminDashboard from "./AdminDashboard.jsx";

// Session-only (not localStorage): closing the tab signs Massy out, no
// long-lived admin credential sitting in the browser between visits.
const SESSION_KEY = "simulateur-amadeus:admin-token";

export default function AdminApp() {
  const [token, setToken] = useState(() => sessionStorage.getItem(SESSION_KEY));

  if (!token) {
    return (
      <AdminLogin
        onLoggedIn={(t) => {
          sessionStorage.setItem(SESSION_KEY, t);
          setToken(t);
        }}
      />
    );
  }

  return (
    <AdminDashboard
      token={token}
      onLogout={() => {
        sessionStorage.removeItem(SESSION_KEY);
        setToken(null);
      }}
    />
  );
}
