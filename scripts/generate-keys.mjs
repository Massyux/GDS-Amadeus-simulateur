#!/usr/bin/env node
// Generates access keys for the simulator (Mission 06 — clé/lien privé).
//
// Usage:
//   node scripts/generate-keys.mjs [count]
//
// Prints the SHA-256 hashes to paste into the Cloudflare Pages project's
// ACCESS_KEY_HASHES environment variable (comma-separated, additive: append
// to the existing value, don't replace it, or you'll revoke every prior key).
// Also writes a CSV of the clear-text keys to keys/<timestamp>.csv (gitignored
// — never commit it) so Massy can hand them out. To revoke a key, remove its
// hash from ACCESS_KEY_HASHES in the Cloudflare dashboard and redeploy.
//
// Must stay in sync with the normalize+hash logic in
// apps/web/src/lib/keyHash.js and functions/api/verify-key.js.

import { randomInt, createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

function randomSegment(length) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

function generateKey() {
  return `GDS-${randomSegment(4)}-${randomSegment(4)}`;
}

function normalizeKey(key) {
  return key.trim().toUpperCase();
}

function sha256Hex(text) {
  return createHash("sha256").update(text).digest("hex");
}

const count = Number.parseInt(process.argv[2], 10) || 1;
const rows = Array.from({ length: count }, () => {
  const key = generateKey();
  return { key, hash: sha256Hex(normalizeKey(key)) };
});

const outDir = path.resolve("keys");
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${Date.now()}.csv`);
const csv = ["key,hash", ...rows.map((r) => `${r.key},${r.hash}`)].join("\n");
writeFileSync(outFile, csv, "utf8");

console.log(`${count} clé(s) générée(s).\n`);
console.log("Clés en clair (à distribuer) — écrites dans :", outFile);
for (const { key } of rows) console.log(" ", key);

console.log("\nHachés à COLLER (en les ajoutant, pas en remplaçant) dans la");
console.log("variable d'environnement Cloudflare Pages ACCESS_KEY_HASHES :\n");
console.log(rows.map((r) => r.hash).join(","));
