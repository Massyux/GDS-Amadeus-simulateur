import { useState } from "react";
import {
  activateKey,
  ACCESS_KEY_STORAGE_KEY,
  ACCESS_TOKEN_STORAGE_KEY,
} from "./accessKey.js";

export default function AccessGate({ t, onValidated, onBack }) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("idle"); // idle | checking | invalid | device-limit

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("checking");
    const result = await activateKey(value);
    if (result.valid) {
      localStorage.setItem(ACCESS_KEY_STORAGE_KEY, "1");
      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, result.token);
      onValidated();
    } else if (result.reason === "DEVICE_LIMIT") {
      setStatus("device-limit");
    } else {
      setStatus("invalid");
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <h1 className="onboarding-title">{t.accessGate.title}</h1>
        <p className="onboarding-tagline">{t.accessGate.tagline}</p>
        <form onSubmit={handleSubmit}>
          <label className="access-key-label" htmlFor="access-key-input">
            {t.accessGate.inputLabel}
          </label>
          <input
            id="access-key-input"
            className="access-key-input"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setStatus("idle");
            }}
            placeholder={t.accessGate.placeholder}
            autoFocus
            autoComplete="off"
            spellCheck="false"
          />
          <div className="access-key-actions">
            <button
              className="onboarding-enter"
              type="submit"
              disabled={status === "checking" || value.trim() === ""}
            >
              {status === "checking" ? t.accessGate.checking : t.accessGate.submit}
            </button>
            {onBack && (
              <button
                className="access-key-back"
                type="button"
                onClick={onBack}
              >
                {t.accessGate.back}
              </button>
            )}
          </div>
        </form>
        {status === "invalid" && (
          <p className="access-key-error" role="alert">
            {t.accessGate.invalid}
          </p>
        )}
        {status === "device-limit" && (
          <p className="access-key-error" role="alert">
            {t.accessGate.deviceLimit}
          </p>
        )}
      </div>
    </div>
  );
}
