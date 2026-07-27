#!/usr/bin/env node
// Generates the admin passphrase + its hash for Mission 14 (espace admin).
//
// Usage:
//   node scripts/generate-admin-secret.mjs
//
// Prints a random passphrase (write it down somewhere safe -- it is not
// stored anywhere, this script never writes to disk) and the SHA-256 hash
// to paste into the Cloudflare Pages project's ADMIN_SECRET_HASH
// environment variable (see README.md "Administration"). Same
// normalize+hash convention as scripts/generate-keys.mjs and
// functions/api/admin/login.js. To rotate the passphrase, just re-run this
// script and replace the env var -- every previously-issued admin session
// token stops verifying immediately (functions/api/admin/login.js signs
// with ADMIN_SECRET_HASH itself).

import { randomInt, createHash } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function randomPassphrase(length = 24) {
  let out = "";
  for (let i = 0; i < length; i += 1) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

function sha256Hex(text) {
  return createHash("sha256").update(text).digest("hex");
}

const secret = randomPassphrase();
const hash = sha256Hex(secret);

console.log("Phrase secrète admin (à noter en lieu sûr, jamais écrite sur disque) :\n");
console.log(" ", secret);
console.log("\nHaché à COLLER dans la variable d'environnement Cloudflare Pages");
console.log("ADMIN_SECRET_HASH (en la remplaçant, pas en l'ajoutant -- un seul admin) :\n");
console.log(" ", hash);
