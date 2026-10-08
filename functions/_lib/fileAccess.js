// URLs signées pour le contenu payant sur R2 (docs/SECURITE.md §5 : "servis
// uniquement par une Function qui vérifie la session et l'inscription au
// cours, via une URL signée expirant en 10 minutes"). Réutilise le même
// mécanisme HMAC que les sessions (functions/_lib/token.js, SESSION_SECRET) --
// pas un presigned URL S3 natif de R2 (aurait demandé des identifiants API R2
// à faire configurer à Massy en plus du binding déjà suffisant pour tout le
// reste) : un Worker qui vérifie puis diffuse l'objet est strictement plus
// simple pour un seul petit bucket, CONSTITUTION §8.
//
// La vérification d'inscription est faite DEUX FOIS par design, pas une
// redondance oubliée : une fois à la génération (functions/api/lessons/[id]/
// index.js, avant de fabriquer le lien), une fois au téléchargement
// (functions/api/files/download.js). Sans la deuxième, un lien déjà généré
// resterait utilisable pendant ses 10 minutes même si l'inscription venait
// d'être révoquée entre-temps -- la même philosophie de révocation instantanée
// que /api/license/check.
import { signToken, verifyToken } from "./token.js";

const DOWNLOAD_TTL_MS = 10 * 60 * 1000;

export async function signDownloadUrl(env, { fileKey, userId, courseId }) {
  const token = await signToken(
    { fileKey, userId, courseId, exp: Date.now() + DOWNLOAD_TTL_MS },
    env.SESSION_SECRET || ""
  );
  return `/api/files/download?token=${encodeURIComponent(token)}`;
}

export async function verifyDownloadToken(env, token) {
  if (typeof token !== "string" || !token) return null;
  const payload = await verifyToken(token, env.SESSION_SECRET || "");
  if (!payload || typeof payload.fileKey !== "string") return null;
  return payload;
}
