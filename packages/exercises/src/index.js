// @ts-check
import { createInitialState } from "@simulateur/core";

/**
 * Exercise JSON format (missions/MISSION-08.md Etape 1). Pure data, no UI
 * concerns -- one file per exercise under packages/exercises/content/.
 *
 * @typedef {Object} Bilingual
 * @property {string} fr
 * @property {string} en
 *
 * @typedef {Object} Objectif
 * @property {string} id
 * @property {string} type - "pnr-recorded" | "segment-count" | "route" |
 *   "passenger-name" | "tst-present" | "ticket-issued" | "element-status"
 * @property {Bilingual} label
 * @property {number} [points] - defaults to 1
 * @property {boolean} [required] - defaults to true (must pass for the
 *   exercise to pass); a required:false objectif still scores but never
 *   blocks passing on its own.
 * @property {string} [status] - segment-count/route/tst-present/
 *   element-status: filter/require this status
 * @property {number} [count] - segment-count: exact active-segment count
 * @property {number} [min] - segment-count: minimum active-segment count
 * @property {number} [max] - segment-count: maximum active-segment count
 * @property {string} [from] - route: origin city code
 * @property {string} [to] - route: destination city code
 * @property {string} [lastName] - passenger-name
 * @property {string} [firstName] - passenger-name
 * @property {string} [title] - passenger-name (e.g. "MR", "MRS")
 *
 * @typedef {Object} JalonTrace
 * @property {string} id
 * @property {string} pattern - regex source, tested against each entry of
 *   commandTrace (case-insensitive)
 * @property {Bilingual} label
 *
 * @typedef {Object} Aide
 * @property {string} id
 * @property {Bilingual} text
 * @property {number} [penalty] - score points deducted once revealed,
 *   defaults to 1
 *
 * @typedef {Object} Exercise
 * @property {string} id
 * @property {number} niveau - 1 to 3
 * @property {Bilingual} titre
 * @property {Bilingual} consigne
 * @property {Object} [seedState] - partial core state merged onto
 *   createInitialState() (see applySeedState)
 * @property {Objectif[]} objectifs
 * @property {JalonTrace[]} [jalonsTrace]
 * @property {Aide[]} [aides]
 * @property {Object} [bareme] - { passThreshold?: number } fraction of the
 *   total achievable points (0-1) required to pass when every objectif is
 *   required:false-mixed; when all objectifs are required (the common
 *   case), passThreshold is ignored and ALL required objectifs must pass.
 */

const DEFAULT_POINTS = 1;

/** Segment statuses that represent a genuinely cancelled/removed segment. */
function isCancelledStatus(status) {
  const normalized = String(status || "HK").toUpperCase();
  return normalized === "HX" || normalized === "XX";
}

/**
 * Builds the working state an exercise starts from: createInitialState()
 * with exercise.seedState shallow-merged on top (per top-level key). No
 * exercise defined in Etape 1 needs anything deeper than that -- a seed
 * only ever pre-populates entire top-level fields (e.g. a whole recorded
 * PNR in pnrStore), never patches inside one.
 * @param {Exercise} exercise
 */
export function applySeedState(exercise) {
  const state = createInitialState();
  if (!exercise || !exercise.seedState) return state;
  return { ...state, ...exercise.seedState };
}

function getActiveSegments(finalState) {
  const pnr = finalState?.activePNR;
  if (!pnr || !Array.isArray(pnr.itinerary)) return [];
  return pnr.itinerary.filter((seg) => !isCancelledStatus(seg.status));
}

/**
 * Evaluates a single objectif against the final state. Returns whether it
 * passed -- never throws on missing data, an absent PNR just fails every
 * objectif cleanly (that IS the "incomplete PNR" case the mission wants
 * precise feedback for, not a crash).
 * @param {Objectif} objectif
 * @param {*} finalState
 */
function evaluateObjectif(objectif, finalState) {
  const pnr = finalState?.activePNR || null;

  switch (objectif.type) {
    case "pnr-recorded":
      return Boolean(pnr && pnr.recordLocator);

    case "segment-count": {
      const segments = getActiveSegments(finalState).filter((seg) =>
        objectif.status ? seg.status === objectif.status : true
      );
      if (typeof objectif.count === "number") {
        return segments.length === objectif.count;
      }
      if (typeof objectif.min === "number" && segments.length < objectif.min) {
        return false;
      }
      if (typeof objectif.max === "number" && segments.length > objectif.max) {
        return false;
      }
      return segments.length > 0;
    }

    case "route": {
      return getActiveSegments(finalState).some(
        (seg) =>
          (!objectif.from || seg.from === objectif.from) &&
          (!objectif.to || seg.to === objectif.to) &&
          (!objectif.status || seg.status === objectif.status)
      );
    }

    case "passenger-name": {
      const passengers = pnr?.passengers || [];
      return passengers.some(
        (p) =>
          (!objectif.lastName || p.lastName === objectif.lastName) &&
          (!objectif.firstName || p.firstName === objectif.firstName) &&
          (!objectif.title || p.title === objectif.title)
      );
    }

    case "tst-present": {
      const tsts = finalState?.tsts || [];
      return tsts.some((tst) =>
        objectif.status ? tst.status === objectif.status : true
      );
    }

    case "ticket-issued": {
      const tickets = pnr?.tickets || [];
      return tickets.some((ticket) => ticket.status !== "VOID");
    }

    case "element-status": {
      return getActiveSegments(finalState).some(
        (seg) => seg.status === objectif.status
      );
    }

    default:
      // Unknown objectif type: fail closed (never silently "pass" content
      // that doesn't match a known evaluator) and surface it in feedback
      // rather than throwing, so one bad exercise file doesn't crash the
      // whole engine.
      return false;
  }
}

function evaluateJalonTrace(jalon, commandTrace) {
  const re = new RegExp(jalon.pattern, "i");
  return (commandTrace || []).some((cmd) => re.test(cmd));
}

/**
 * @param {Exercise} exercise
 * @param {*} finalState - a @simulateur/core state object
 * @param {string[]} commandTrace - every command the student issued
 *   (already-uppercased command strings, e.g. finalState.commandHistory)
 * @param {Object} [options]
 * @param {number} [options.hintsUsed] - how many aides[] entries were
 *   revealed, in order; only the FIRST N aides' penalties are applied
 * @returns {{
 *   passed: boolean,
 *   score: number,
 *   maxScore: number,
 *   feedback: Array<{ objectifId: string, passed: boolean, label: Bilingual }>,
 *   jalonsFeedback: Array<{ jalonId: string, reached: boolean, label: Bilingual }>,
 * }}
 */
export function evaluate(exercise, finalState, commandTrace, options = {}) {
  const objectifs = exercise?.objectifs || [];
  const hintsUsed = Math.max(0, options.hintsUsed || 0);

  const feedback = objectifs.map((objectif) => {
    const objPassed = evaluateObjectif(objectif, finalState);
    return {
      objectifId: objectif.id,
      passed: objPassed,
      label: objectif.label,
    };
  });

  const requiredObjectifs = objectifs.filter((o) => o.required !== false);
  const requiredResults = feedback.filter((f) =>
    requiredObjectifs.some((o) => o.id === f.objectifId)
  );
  const passed =
    requiredObjectifs.length > 0 && requiredResults.every((f) => f.passed);

  const maxScore = objectifs.reduce(
    (sum, o) => sum + (typeof o.points === "number" ? o.points : DEFAULT_POINTS),
    0
  );
  const earnedScore = objectifs.reduce((sum, o, i) => {
    const points = typeof o.points === "number" ? o.points : DEFAULT_POINTS;
    return sum + (feedback[i].passed ? points : 0);
  }, 0);

  const aides = exercise?.aides || [];
  const hintPenalty = aides
    .slice(0, hintsUsed)
    .reduce((sum, aide) => sum + (typeof aide.penalty === "number" ? aide.penalty : 1), 0);

  const score = Math.max(0, earnedScore - hintPenalty);

  const jalonsFeedback = (exercise?.jalonsTrace || []).map((jalon) => ({
    jalonId: jalon.id,
    reached: evaluateJalonTrace(jalon, commandTrace),
    label: jalon.label,
  }));

  return { passed, score, maxScore, feedback, jalonsFeedback };
}
