// Device fingerprint (Mission 14 — espace admin + licences). A stable hash
// of a handful of browser signals, used only to count "how many distinct
// devices has this license activated" -- NOT a security boundary.
//
// Honest limits (documented per the mission's own instruction, not glossed
// over): a motivated user can spoof or randomize any of these signals
// (browser devtools, a different browser, incognito mode changing canvas
// noise, etc). The goal is to make casual key-sharing between devices
// mildly inconvenient, not to make it cryptographically impossible --
// see docs/LICENCES.md.
function canvasSignal() {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillText("GDS-fingerprint-🛫", 2, 2);
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

function rawSignals() {
  return [
    navigator.userAgent || "",
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    navigator.language || "",
    String(navigator.hardwareConcurrency || ""),
    canvasSignal(),
  ].join("|");
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

let cached = null;

export async function getDeviceFingerprint() {
  if (!cached) {
    cached = await sha256Hex(rawSignals());
  }
  return cached;
}
