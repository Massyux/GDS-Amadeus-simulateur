// @ts-check
// Single load point for the exercise content shipped in ../content/*.json
// (missions/MISSION-08.md Etape 2/3). Consumers (tests, apps/web) import
// from here rather than reaching into ../content directly, so adding a
// future exercise only means adding one line here.
import ex01 from "../content/ex-01-read-availability.json" with { type: "json" };
import ex02 from "../content/ex-02-decode.json" with { type: "json" };
import ex03 from "../content/ex-03-first-sale.json" with { type: "json" };
import ex04 from "../content/ex-04-full-pnr.json" with { type: "json" };
import ex05 from "../content/ex-05-long-sell.json" with { type: "json" };
import ex06 from "../content/ex-06-retrieve-modify.json" with { type: "json" };
import ex07 from "../content/ex-07-fix-mistakes.json" with { type: "json" };
import ex08 from "../content/ex-08-price-and-issue.json" with { type: "json" };
import ex09 from "../content/ex-09-waitlist.json" with { type: "json" };
import ex10 from "../content/ex-10-full-workflow.json" with { type: "json" };

/** @type {import("./index.js").Exercise[]} */
export const exercises = [ex01, ex02, ex03, ex04, ex05, ex06, ex07, ex08, ex09, ex10];

export const exercisesById = Object.fromEntries(
  exercises.map((exercise) => [exercise.id, exercise])
);
