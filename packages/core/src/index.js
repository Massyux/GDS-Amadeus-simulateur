// @ts-check
import { createSimAvailabilityProvider } from "./providers/availability/sim.js";
import { createSimPricingProvider } from "./providers/pricing/sim.js";

function padL(s, w, ch = " ") {
  return String(s ?? "").padStart(w, ch);
}
function padR(s, w, ch = " ") {
  return String(s ?? "").padEnd(w, ch);
}
function pad2(n) {
  return String(n).padStart(2, "0");
}

function month2Mon(m) {
  const mons = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return mons[m - 1] || "???";
}

function parseDDMMM(s, clock) {
  const m = s.match(/^(\d{1,2})([A-Z]{3})$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mon = m[2];
  const map = {
    JAN: 1,
    FEB: 2,
    MAR: 3,
    APR: 4,
    MAY: 5,
    JUN: 6,
    JUL: 7,
    AUG: 8,
    SEP: 9,
    OCT: 10,
    NOV: 11,
    DEC: 12,
  };
  const mm = map[mon];
  if (!mm) return null;
  const now = getClockNow(clock);
  const date = new Date(now.getFullYear(), mm - 1, dd);
  if (
    date.getFullYear() !== now.getFullYear() ||
    date.getMonth() !== mm - 1 ||
    date.getDate() !== dd
  ) {
    return null;
  }
  return date;
}

function formatDDMMM(dateObj) {
  const dd = pad2(dateObj.getDate());
  const mon = month2Mon(dateObj.getMonth() + 1);
  return `${dd}${mon}`;
}

function dayOfWeek2(dateObj) {
  const d = dateObj.getDay();
  const map = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  return map[d] || "??";
}

function getClockNow(clock) {
  if (clock && typeof clock.now === "function") {
    const value = clock.now();
    return value instanceof Date ? value : new Date(value);
  }
  return new Date();
}

function ddmmmToDate(ddmmm, clock) {
  if (!ddmmm || typeof ddmmm !== "string") return null;
  const m = ddmmm.toUpperCase().match(/^(\d{1,2})([A-Z]{3})$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mon = m[2];
  const map = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11,
  };
  if (!(mon in map)) return null;
  const now = getClockNow(clock);
  const date = new Date(now.getFullYear(), map[mon], dd);
  if (
    date.getFullYear() !== now.getFullYear() ||
    date.getMonth() !== map[mon] ||
    date.getDate() !== dd
  ) {
    return null;
  }
  return date;
}

function buildRecordLocatorSeed(pnr) {
  if (!pnr) return "PNR|EMPTY";
  const paxPart = (pnr.passengers || [])
    .map(
      (p) =>
        `${p.type || "ADT"}:${p.lastName || ""}/${p.firstName || ""}:${p.title || ""}:${p.age || ""}`
    )
    .join("|");
  const segPart = (pnr.itinerary || [])
    .map(
      (s) =>
        `${s.dateDDMMM || ""}:${s.from || ""}-${s.to || ""}:${s.airline || ""}${s.flightNo || ""}:${s.classCode || ""}:${s.paxCount || 1}`
    )
    .join("|");
  const contactPart = (pnr.contacts || []).join("|");
  const rfPart = pnr.rf || "";
  return `PNR|${paxPart}|${segPart}|${contactPart}|${rfPart}`;
}

function generateRecordLocator(pnr) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const rand = createSeededRandom(buildRecordLocatorSeed(pnr));
  let rl = "";
  for (let i = 0; i < 6; i++) {
    rl += chars[Math.floor(rand() * chars.length)];
  }
  return rl;
}

function deepCopy(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function wrapTokens(tokens, maxPerLine) {
  const out = [];
  for (let i = 0; i < tokens.length; i += maxPerLine) {
    out.push(tokens.slice(i, i + maxPerLine));
  }
  return out;
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createSeededRandom(seed) {
  let x = hashSeed(seed) || 0x9e3779b9;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function timeFromMinutes(totalMinutes) {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${pad2(h)}${pad2(m)}`;
}

function normalizeQueueId(queueId) {
  return String(queueId || "").trim().toUpperCase();
}

function ensureQueueStore(store) {
  return store && typeof store === "object" ? store : {};
}

function queueAdd(store, queueId, recordLocator) {
  const normalizedId = normalizeQueueId(queueId);
  const normalizedRl = String(recordLocator || "").trim().toUpperCase();
  if (!normalizedId || !normalizedRl) return ensureQueueStore(store);
  const next = ensureQueueStore(store);
  next[normalizedId] ||= [];
  if (!next[normalizedId].includes(normalizedRl)) {
    next[normalizedId].push(normalizedRl);
  }
  return next;
}

function queueRemove(store, queueId, recordLocator) {
  const normalizedId = normalizeQueueId(queueId);
  const normalizedRl = String(recordLocator || "").trim().toUpperCase();
  const next = ensureQueueStore(store);
  if (!normalizedId || !next[normalizedId]) return next;
  next[normalizedId] = next[normalizedId].filter((rl) => rl !== normalizedRl);
  return next;
}

function queuePeek(store, queueId) {
  const normalizedId = normalizeQueueId(queueId);
  const next = ensureQueueStore(store);
  if (!normalizedId || !next[normalizedId] || next[normalizedId].length === 0) {
    return null;
  }
  return next[normalizedId][0];
}

export const __queueStoreUtils = {
  normalizeQueueId,
  ensureQueueStore,
  queueAdd,
  queueRemove,
  queuePeek,
};

const AVAILABLE_CLASS_CODES = [
  "J",
  "C",
  "D",
  "Y",
  "E",
  "B",
  "M",
  "H",
  "K",
  "Q",
  "V",
  "L",
  "T",
  "N",
  "R",
  "S",
  "X",
  "W",
  "A",
  "F",
  "Z",
  "I",
];

function buildOfflineAvailability({ from, to, ddmmm, dow }) {
  const rand = createSeededRandom(`${from}${to}${ddmmm}`);
  const randInt = (max) => Math.floor(rand() * max);
  const carriers = ["AH", "AF", "TK", "PC", "SV", "AT"];
  for (let i = carriers.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [carriers[i], carriers[j]] = [carriers[j], carriers[i]];
  }
  const carrierCount = 2 + randInt(3);
  const chosenCarriers = carriers.slice(0, carrierCount);

  const classes = AVAILABLE_CLASS_CODES;

  const pickSeats = (code) => {
    if (code === "J" || code === "C" || code === "D") {
      return [0, 0, 2, 4][randInt(4)];
    }
    if (code === "Y" || code === "E" || code === "B" || code === "M") {
      return [4, 9, 9, 2][randInt(4)];
    }
    return [0, 2, 4, 9][randInt(4)];
  };

  const flightsCount = 8 + randInt(5);
  const depStart = 6 * 60;
  const depEnd = 22 * 60 - 90;
  const stepCount = Math.floor((depEnd - depStart) / 15) + 1;
  const results = [];

  for (let i = 0; i < flightsCount; i++) {
    const airline = chosenCarriers[i % chosenCarriers.length];
    const flightNo = 100 + randInt(9900);
    const depMinutes = depStart + randInt(stepCount) * 15;
    const duration = 90 + randInt(11) * 15;
    const arrMinutes = depMinutes + duration;
    const bookingClasses = classes.map((code) => ({
      code,
      seats: pickSeats(code),
    }));

    results.push({
      lineNo: i + 1,
      airline,
      flightNo,
      from,
      to,
      dateDDMMM: ddmmm,
      dow,
      depTime: timeFromMinutes(depMinutes),
      arrTime: timeFromMinutes(arrMinutes),
      bookingClasses,
    });
  }

  const sorted = results
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => {
      if (a.item.depTime === b.item.depTime) return a.idx - b.idx;
      return a.item.depTime < b.item.depTime ? -1 : 1;
    })
    .map((entry, idx) => ({ ...entry.item, lineNo: idx + 1 }));

  return sorted;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function formatMoney(n) {
  return round2(n).toFixed(2);
}

function getSortedItinerary(pnr, clock) {
  const itinerary = pnr.itinerary || [];
  const decorated = itinerary.map((s, idx) => {
    const d = ddmmmToDate(s.dateDDMMM, clock);
    const t = d ? d.getTime() : Number.POSITIVE_INFINITY;
    return { s, idx, t };
  });
  decorated.sort((a, b) => (a.t !== b.t ? a.t - b.t : a.idx - b.idx));
  return decorated.map((item, index) => ({
    ...item.s,
    displayIndex: index + 1,
  }));
}

function getActiveSortedItinerary(pnr, clock) {
  return getSortedItinerary(pnr, clock).filter(
    (segment) => !isSegmentCancelledStatus(segment.status)
  );
}

function getPaxCounts(pnr) {
  const counts = { ADT: 0, CHD: 0, INF: 0 };
  for (const p of pnr.passengers || []) {
    if (p.type === "CHD") counts.CHD += 1;
    else if (p.type === "INF") counts.INF += 1;
    else counts.ADT += 1;
  }
  return counts;
}

function inferPaxCounts(pnr) {
  const paxCounts = getPaxCounts(pnr);
  if (paxCounts.ADT || paxCounts.CHD || paxCounts.INF) {
    return paxCounts;
  }
  const paxCount = Math.max(
    1,
    ...(pnr.itinerary || []).map((seg) => seg.paxCount || 1)
  );
  return { ADT: paxCount, CHD: 0, INF: 0 };
}

function resolveZone(iata) {
  const code = String(iata || "").toUpperCase();
  const DZ = ["ALG", "ORN", "CZL", "TLM"];
  const TR = ["IST", "SAW"];
  const EU = ["PAR", "LON", "MAD", "ROM", "AMS", "BRU", "FRA", "MUC", "BCN", "LIS"];
  if (DZ.includes(code)) return "DZ";
  if (TR.includes(code)) return "TR";
  if (EU.includes(code)) return "EU";
  return "OTHER";
}

function getTaxRates(fromZone, toZone) {
  const isDomestic = fromZone === toZone;
  if (fromZone === "DZ" && isDomestic) {
    return { DZ: 9.0, FR: 6.4, YQ: 8.0, XT: 3.0 };
  }
  if (
    (fromZone === "DZ" && toZone === "EU") ||
    (fromZone === "EU" && toZone === "DZ")
  ) {
    return { DZ: 18.0, FR: 22.4, YQ: 18.0, XT: 6.0 };
  }
  if (
    (fromZone === "DZ" && toZone === "TR") ||
    (fromZone === "TR" && toZone === "DZ")
  ) {
    return { DZ: 18.0, FR: 16.4, YQ: 14.0, XT: 5.0 };
  }
  if (fromZone === "EU" && toZone === "EU") {
    return { DZ: 0, FR: 18.6, YQ: 12.0, XT: 5.0 };
  }
  return { DZ: 0, FR: 20.0, YQ: 16.0, XT: 5.0 };
}

function isRoundTrip(segments) {
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      if (segments[i].from === segments[j].to && segments[i].to === segments[j].from) {
        return true;
      }
    }
  }
  return false;
}

function buildRouteDistance(from, to) {
  const key = `${from}-${to}`;
  const map = {
    "ALG-PAR": 1375,
    "PAR-ALG": 1375,
    "ALG-MRS": 780,
    "MRS-ALG": 780,
    "ALG-IST": 2400,
    "IST-ALG": 2400,
    "ALG-CMN": 1050,
    "CMN-ALG": 1050,
  };
  if (map[key]) return map[key];
  const rand = createSeededRandom(key);
  return 700 + Math.floor(rand() * 1400);
}

function buildFareBasis(classCode, from, seed) {
  const rand = createSeededRandom(seed);
  const digits = 10 + Math.floor(rand() * 40);
  const suffix = (from || "XX").slice(0, 2);
  return `${classCode}${digits}${suffix}`;
}

function buildPricingData(pnr, mode, segmentsOverride, clock) {
  const segments = segmentsOverride || getSortedItinerary(pnr, clock);
  const paxCounts = inferPaxCounts(pnr);
  const paxMix = `ADT${paxCounts.ADT}CHD${paxCounts.CHD}INF${paxCounts.INF}`;
  const taxes = { DZ: 0, FR: 0, YQ: 0, XT: 0 };
  const paxMultiplier = { ADT: 1, CHD: 0.75, INF: 0.1 };
  const classMultiplier = {
    J: 1.8,
    C: 1.4,
    D: 1.3,
    Y: 1.0,
    B: 0.9,
    M: 0.85,
    H: 0.82,
    K: 0.8,
    Q: 0.78,
    V: 0.76,
    L: 0.74,
    T: 0.72,
    N: 0.7,
    R: 0.68,
    S: 0.66,
  };
  const fareBasis = [];
  let baseFare = 0;

  for (const seg of segments) {
    const fromZone = resolveZone(seg.from);
    const toZone = resolveZone(seg.to);
    const rates = getTaxRates(fromZone, toZone);
    const seed = `${seg.from}${seg.to}${seg.dateDDMMM}${seg.airline}${seg.flightNo}${seg.classCode}${paxMix}${mode}`;
    const rand = createSeededRandom(seed);
    const distance = buildRouteDistance(seg.from, seg.to);
    const mult = classMultiplier[seg.classCode] || 1;
    const offset = rand() * 25;
    const segBase = distance * mult / 10 + offset;
    baseFare += segBase * paxMultiplier.ADT * paxCounts.ADT;
    baseFare += segBase * paxMultiplier.CHD * paxCounts.CHD;
    baseFare += segBase * paxMultiplier.INF * paxCounts.INF;
    fareBasis.push(buildFareBasis(seg.classCode, seg.from, seed));

    const addTax = (code, amount) => {
      taxes[code] = round2(taxes[code] + amount);
    };
    const applyTaxes = (count, type) => {
      if (!count) return;
      if (type === "ADT") {
        addTax("DZ", rates.DZ * count);
        addTax("FR", rates.FR * count);
        addTax("YQ", rates.YQ * count);
        addTax("XT", rates.XT * count);
      } else if (type === "CHD") {
        addTax("DZ", round2(rates.DZ * 0.75) * count);
        addTax("FR", round2(rates.FR * 0.75) * count);
        addTax("YQ", round2(rates.YQ * 0.75) * count);
        addTax("XT", rates.XT * count);
      } else if (type === "INF") {
        addTax("DZ", round2(rates.DZ * 0.2) * count);
        addTax("FR", round2(rates.FR * 0.2) * count);
        addTax("XT", 1.0 * count);
      }
    };
    applyTaxes(paxCounts.ADT, "ADT");
    applyTaxes(paxCounts.CHD, "CHD");
    applyTaxes(paxCounts.INF, "INF");
  }

  if (isRoundTrip(segments)) {
    const paxTotal = paxCounts.ADT + paxCounts.CHD + paxCounts.INF;
    taxes.XT = round2(taxes.XT + 2.0 * paxTotal);
  }

  const taxTotal = round2(taxes.DZ + taxes.FR + taxes.YQ + taxes.XT);
  const total = round2(round2(baseFare) + taxTotal);

  return {
    segments,
    paxCounts,
    fareBasis,
    baseFare: round2(baseFare),
    taxes,
    taxTotal,
    total,
    validatingCarrier: segments[0]?.airline || "XX",
  };
}

const RBD_LADDER = ["J", "C", "D", "Y", "B", "M", "H", "K", "Q", "V", "L", "T", "N", "R", "S"];

function rebookSegments(pnr, mode) {
  const rebooked = [];
  for (const seg of pnr.itinerary || []) {
    const current = seg.classCode || "Y";
    const idx = RBD_LADDER.indexOf(current);
    const index = idx === -1 ? 3 : idx;
    const seed = `${seg.from}${seg.to}${seg.dateDDMMM}${seg.airline}${seg.flightNo}${current}${mode}`;
    const rand = createSeededRandom(seed);
    const maxStep = Math.max(1, RBD_LADDER.length - 1 - index);
    const step = Math.min(maxStep, 1 + Math.floor(rand() * 3));
    const newIndex = Math.min(RBD_LADDER.length - 1, index + step);
    const next = RBD_LADDER[newIndex];
    rebooked.push({ from: current, to: next });
    seg.classCode = next;
  }
  return rebooked;
}

function formatPaxSummary(paxCounts) {
  const parts = [];
  parts.push(`ADT*${paxCounts.ADT}`);
  if (paxCounts.CHD) parts.push(`CHD*${paxCounts.CHD}`);
  if (paxCounts.INF) parts.push(`INF*${paxCounts.INF}`);
  return parts.join(" ");
}

function formatSegmentsRange(segments) {
  if (!segments.length) return "-";
  if (segments.length === 1) return `${segments[0]}`;
  return `${segments[0]}-${segments[segments.length - 1]}`;
}

function buildTstSummaryLine(tst) {
  const paxSummary = formatPaxSummary(tst.paxCounts);
  return `TST ${tst.id}  PAX ${paxSummary}  EUR ${formatMoney(
    tst.total
  )}  VC ${tst.validatingCarrier}  STATUS ${tst.status}`;
}

function buildTstDetailLines(tst) {
  const lines = [];
  lines.push(`TQT${tst.id}`);
  lines.push(`TST ${tst.id}   STATUS: ${tst.status}`);
  lines.push(`PAX: ${formatPaxSummary(tst.paxCounts)}`);
  lines.push(`VC: ${tst.validatingCarrier}`);
  lines.push(`SEGMENTS:`);
  for (const seg of tst.segmentDetails) {
    lines.push(
      `  ${seg.displayIndex}  ${seg.airline} ${seg.flightNo}  ${seg.classCode}  ${seg.dateDDMMM}  ${seg.from}${seg.to}  ${seg.depTime} ${seg.arrTime}`
    );
  }
  lines.push(``);
  lines.push(`FARE BASIS:`);
  tst.fareBasis.forEach((fb, idx) => {
    lines.push(`  ${idx + 1}  ${fb}`);
  });
  lines.push(``);
  lines.push(`FARE     EUR ${formatMoney(tst.baseFare)}`);
  lines.push(`TAX      EUR ${formatMoney(tst.taxTotal)}`);
  lines.push(`  DZ     ${formatMoney(tst.taxes.DZ)}`);
  lines.push(`  FR     ${formatMoney(tst.taxes.FR)}`);
  lines.push(`  YQ     ${formatMoney(tst.taxes.YQ)}`);
  lines.push(`  XT     ${formatMoney(tst.taxes.XT)}`);
  lines.push(`TOTAL    EUR ${formatMoney(tst.total)}`);
  return lines;
}

function buildFqnLines(fareBasis, seed) {
  const rand = createSeededRandom(seed);
  const changeFee = 40 + Math.floor(rand() * 80);
  const noShow = 60 + Math.floor(rand() * 90);
  const baggage = rand() > 0.3 ? "1PC" : "0PC";
  const advance = rand() > 0.5 ? "7 DAYS" : "3 DAYS";
  const minStay = rand() > 0.5 ? "2D" : "1D";
  const maxStay = rand() > 0.5 ? "3M" : "6M";
  return [
    `FARE NOTES / CONDITIONS (SIMULATED)`,
    `FARE BASIS: ${fareBasis}`,
    `REFUND: NON-REFUNDABLE`,
    `CHANGES: PERMITTED WITH FEE EUR ${changeFee}`,
    `NO-SHOW: EUR ${noShow}`,
    `BAGGAGE: ${baggage}`,
    `ADVANCE PURCHASE: ${advance}`,
    `MIN/MAX STAY: ${minStay} / ${maxStay}`,
  ];
}

function createNormalizedTst({ id, pricing, status = "CREATED", currency = "EUR" }) {
  return {
    id,
    currency,
    pricingStatus: status,
    status,
    paxCounts: pricing.paxCounts,
    segments: pricing.segments.map((s) => s.displayIndex),
    segmentDetails: pricing.segments.map((s) => ({ ...s })),
    validatingCarrier: pricing.validatingCarrier,
    fareBasis: pricing.fareBasis,
    totals: {
      fare: pricing.baseFare,
      taxes: { ...pricing.taxes },
      taxTotal: pricing.taxTotal,
      total: pricing.total,
    },
    baseFare: pricing.baseFare,
    taxes: pricing.taxes,
    taxTotal: pricing.taxTotal,
    total: pricing.total,
  };
}

function formatTicketNumber(sequence) {
  return `172-${String(sequence).padStart(10, "0")}`;
}

function ensurePNR(state) {
  if (!state.activePNR) {
    state.activePNR = {
      passengers: [],
      contacts: [],
      emails: [],
      rf: null,
      recordLocator: null,
      status: "ACTIVE",
      itinerary: [],
      ssr: [],
      osi: [],
      remarks: [],
      options: [],
      tk: null,
      fp: null,
      tickets: [],
      receipts: [],
      elements: [],
    };
  } else {
    state.activePNR.passengers ||= [];
    state.activePNR.contacts ||= [];
    state.activePNR.emails ||= [];
    state.activePNR.itinerary ||= [];
    state.activePNR.ssr ||= [];
    state.activePNR.osi ||= [];
    state.activePNR.remarks ||= [];
    state.activePNR.options ||= [];
    state.activePNR.tk ||= null;
    state.activePNR.fp ||= null;
    state.activePNR.tickets ||= [];
    state.activePNR.receipts ||= [];
    state.activePNR.elements ||= [];
  }
}

function paxDisplay(p) {
  if (p.type === "CHD") {
    if (p.age) return `${p.lastName}/${p.firstName} (CHD/${p.age})`;
    return `${p.lastName}/${p.firstName} (CHD)`;
  }
  if (p.type === "INF") return `${p.lastName}/${p.firstName} (INF)`;
  if (p.title) return `${p.lastName}/${p.firstName} ${p.title}`;
  return `${p.lastName}/${p.firstName}`;
}

function parseNmAdultEntries(cmdUpper) {
  const match = cmdUpper.match(/^NM(\d+)(.+)$/);
  if (!match) return null;

  const requestedCount = parseInt(match[1], 10);
  if (!Number.isInteger(requestedCount) || requestedCount < 1) return null;

  const payload = match[2].trim();
  if (!payload || payload.includes("(")) return null;

  const tokens = payload.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  let singleTitle = "";
  if (
    requestedCount === 1 &&
    tokens.length >= 2 &&
    /^(MR|MRS)$/.test(tokens[tokens.length - 1])
  ) {
    singleTitle = tokens.pop();
  }

  const adults = [];
  for (const token of tokens) {
    const nameMatch = token.match(/^([A-Z'-]+)\/([A-Z'-]+)$/);
    if (!nameMatch) return null;
    adults.push({
      lastName: nameMatch[1],
      firstName: nameMatch[2],
      type: "ADT",
      title: "",
    });
  }

  if (adults.length !== requestedCount) return null;
  if (adults.length === 1) {
    adults[0].title = singleTitle;
  }
  return adults;
}

function segmentLineForPNR(s) {
  const airline = padR(s.airline || "XX", 2);
  const flightNo = padL(String(s.flightNo || "0"), 4, "0");
  const cls = padR(s.classCode || "Y", 1);
  const ddmmm = padR(s.dateDDMMM || "?????", 5);
  const pair = padR(`${s.from || "XXX"}${s.to || "XXX"}`, 6);
  const dep = padL(s.depTime || "----", 4, "0");
  const arr = padL(s.arrTime || "----", 4, "0");
  const st = padR(s.status || "HK", 2);
  const pax = String(s.paxCount || 1);
  return `${airline} ${flightNo} ${cls} ${ddmmm} ${pair} ${dep} ${arr} ${st}${pax}`;
}

function rebuildPnrElements(pnr, clock) {
  if (!pnr) return [];

  pnr.passengers ||= [];
  pnr.itinerary ||= [];
  pnr.contacts ||= [];
  pnr.emails ||= [];
  pnr.ssr ||= [];
  pnr.osi ||= [];
  pnr.remarks ||= [];
  pnr.options ||= [];
  pnr.tickets ||= [];
  pnr.receipts ||= [];

  /** @type {Array<{ kind: string, index?: number }>} */
  const elements = [];

  pnr.passengers.forEach((_, index) => {
    elements.push({ kind: "PAX", index });
  });

  if (pnr.itinerary.length > 0) {
    const decorated = pnr.itinerary.map((segment, index) => {
      const dateObj = ddmmmToDate(segment.dateDDMMM, clock);
      const timeValue = dateObj ? dateObj.getTime() : Number.POSITIVE_INFINITY;
      return { index, timeValue };
    });
    decorated.sort((a, b) =>
      a.timeValue !== b.timeValue ? a.timeValue - b.timeValue : a.index - b.index
    );
    decorated.forEach((item) => {
      elements.push({ kind: "SEG", index: item.index });
    });
  }

  pnr.ssr.forEach((_, index) => {
    elements.push({ kind: "SSR", index });
  });
  pnr.osi.forEach((_, index) => {
    elements.push({ kind: "OSI", index });
  });
  pnr.remarks.forEach((_, index) => {
    elements.push({ kind: "RM", index });
  });
  pnr.options.forEach((_, index) => {
    elements.push({ kind: "OP", index });
  });

  if (pnr.tk) elements.push({ kind: "TK" });
  if (pnr.fp) elements.push({ kind: "FP" });
  pnr.tickets.forEach((_, index) => {
    elements.push({ kind: "TKT", index });
  });
  pnr.receipts.forEach((_, index) => {
    elements.push({ kind: "ITR", index });
  });

  pnr.contacts.forEach((_, index) => {
    elements.push({ kind: "AP", index });
  });
  pnr.emails.forEach((_, index) => {
    elements.push({ kind: "APE", index });
  });

  if (pnr.rf) elements.push({ kind: "RF" });
  if (pnr.recordLocator) elements.push({ kind: "RECLOC" });

  pnr.elements = elements;
  return elements;
}

function renderPNRLiveView(state, clock) {
  if (!state.activePNR) {
    return ["NO ACTIVE PNR"];
  }

  const pnr = state.activePNR;
  const orderedElements = rebuildPnrElements(pnr, clock);
  const lines = [];
  let n = 1;
  for (const element of orderedElements) {
    if (element.kind === "PAX") {
      const pax = pnr.passengers[element.index];
      if (!pax) continue;
      lines.push(`${padL(n, 2)} ${paxDisplay(pax)}`);
      n++;
      continue;
    }
    if (element.kind === "SEG") {
      const segment = pnr.itinerary[element.index];
      if (!segment) continue;
      const line =
        segment.type === "ARNK"
          ? isSegmentCancelledStatus(segment.status)
            ? `ARNK ${segment.status}`
            : "ARNK"
          : segmentLineForPNR(segment);
      lines.push(`${padL(n, 2)} ${line}`);
      n++;
      continue;
    }
    if (element.kind === "SSR") {
      const ssr = pnr.ssr[element.index];
      if (!ssr) continue;
      lines.push(`${padL(n, 2)} SSR ${ssr}`);
      n++;
      continue;
    }
    if (element.kind === "OSI") {
      const osi = pnr.osi[element.index];
      if (!osi) continue;
      lines.push(`${padL(n, 2)} OSI ${osi}`);
      n++;
      continue;
    }
    if (element.kind === "RM") {
      const remark = pnr.remarks[element.index];
      if (!remark) continue;
      lines.push(`${padL(n, 2)} RM ${remark}`);
      n++;
      continue;
    }
    if (element.kind === "OP") {
      const option = pnr.options[element.index];
      if (!option || !option.text) continue;
      const opDate = option.date ? option.date : "";
      lines.push(`${padL(n, 2)} OP${opDate}/${option.text}`);
      n++;
      continue;
    }
    if (element.kind === "TK" && pnr.tk) {
      const line =
        pnr.tk.kind === "OK"
          ? "TKOK"
          : pnr.tk.kind === "XL"
            ? `TKXL/${pnr.tk.date}`
            : `TKTL/${pnr.tk.date}`;
      lines.push(`${padL(n, 2)} ${line}`);
      n++;
      continue;
    }
    if (element.kind === "FP" && pnr.fp) {
      lines.push(`${padL(n, 2)} FP ${pnr.fp}`);
      n++;
      continue;
    }
    if (element.kind === "TKT") {
      const ticket = pnr.tickets[element.index];
      if (!ticket) continue;
      lines.push(
        `${padL(n, 2)} FA ${ticket.ticketNumber} ${ticket.status || "ISSUED"}`
      );
      n++;
      lines.push(
        `${padL(n, 2)} FB TST${ticket.tstId || "-"} ${ticket.ticketNumber}`
      );
      n++;
      continue;
    }
    if (element.kind === "ITR") {
      const receipt = pnr.receipts[element.index];
      if (!receipt) continue;
      lines.push(
        `${padL(n, 2)} ITR-EML ${receipt.email} TKT ${receipt.ticketNumber}`
      );
      n++;
      continue;
    }
    if (element.kind === "AP") {
      const ap = pnr.contacts[element.index];
      if (!ap) continue;
      lines.push(`${padL(n, 2)} ${ap}`);
      n++;
      continue;
    }
    if (element.kind === "APE") {
      const ape = pnr.emails[element.index];
      if (!ape) continue;
      lines.push(`${padL(n, 2)} APE ${ape}`);
      n++;
      continue;
    }
    if (element.kind === "RF" && pnr.rf) {
      lines.push(`${padL(n, 2)} RF ${pnr.rf}`);
      n++;
      continue;
    }
    if (element.kind === "RECLOC" && pnr.recordLocator) {
      lines.push(`${padL(n, 2)} REC LOC ${pnr.recordLocator}`);
      n++;
    }
  }

  if (state.tsts && state.tsts.length > 0) {
    for (const tst of state.tsts) {
      lines.push(buildTstSummaryLine(tst));
    }
  }

  return lines;
}

function buildElementIndex(state, clock) {
  if (!state.activePNR) return [];
  const pnr = state.activePNR;
  const orderedElements = rebuildPnrElements(pnr, clock);
  const elements = [];
  let elementNo = 1;

  for (const entry of orderedElements) {
    if (entry.kind === "PAX") {
      elements.push({
        elementNo,
        kind: "PAX",
        index: entry.index,
        ref: { paxIndex: entry.index },
      });
      elementNo += 1;
      continue;
    }
    if (entry.kind === "SEG") {
      elements.push({
        elementNo,
        kind: "SEG",
        index: entry.index,
        ref: pnr.itinerary[entry.index],
      });
      elementNo += 1;
      continue;
    }
    if (
      entry.kind === "AP" ||
      entry.kind === "ITR" ||
      entry.kind === "APE" ||
      entry.kind === "SSR" ||
      entry.kind === "OSI" ||
      entry.kind === "RM" ||
      entry.kind === "OP"
    ) {
      elements.push({ elementNo, kind: entry.kind, index: entry.index });
      elementNo += 1;
      continue;
    }
    if (entry.kind === "TKT") {
      elements.push({ elementNo, kind: "TKT_FA", index: entry.index });
      elementNo += 1;
      elements.push({ elementNo, kind: "TKT_FB", index: entry.index });
      elementNo += 1;
      continue;
    }
    if (
      entry.kind === "TK" ||
      entry.kind === "FP" ||
      entry.kind === "RF" ||
      entry.kind === "RECLOC"
    ) {
      elements.push({ elementNo, kind: entry.kind });
      elementNo += 1;
    }
  }

  return elements;
}

function cancelElements(state, elements) {
  const pnr = state.activePNR;
  if (!pnr) return;
  pnr.contacts ||= [];
  pnr.emails ||= [];
  pnr.ssr ||= [];
  pnr.osi ||= [];
  pnr.remarks ||= [];
  pnr.options ||= [];

  const apIndexes = [];
  const apeIndexes = [];
  const ssrIndexes = [];
  const osiIndexes = [];
  const rmIndexes = [];
  const opIndexes = [];
  let cancelRf = false;
  let cancelTk = false;
  let cancelFp = false;

  for (const element of elements) {
    if (element.kind === "SEG" && element.ref) {
      element.ref.status = "XX";
    } else if (element.kind === "AP") {
      apIndexes.push(element.index);
    } else if (element.kind === "APE") {
      apeIndexes.push(element.index);
    } else if (element.kind === "SSR") {
      ssrIndexes.push(element.index);
    } else if (element.kind === "OSI") {
      osiIndexes.push(element.index);
    } else if (element.kind === "RM") {
      rmIndexes.push(element.index);
    } else if (element.kind === "OP") {
      opIndexes.push(element.index);
    } else if (element.kind === "TK") {
      cancelTk = true;
    } else if (element.kind === "FP") {
      cancelFp = true;
    } else if (element.kind === "RF") {
      cancelRf = true;
    }
  }

  apIndexes.sort((a, b) => b - a).forEach((idx) => {
    if (idx >= 0 && idx < pnr.contacts.length) pnr.contacts.splice(idx, 1);
  });
  apeIndexes.sort((a, b) => b - a).forEach((idx) => {
    if (idx >= 0 && idx < pnr.emails.length) pnr.emails.splice(idx, 1);
  });
  ssrIndexes.sort((a, b) => b - a).forEach((idx) => {
    if (idx >= 0 && idx < pnr.ssr.length) pnr.ssr.splice(idx, 1);
  });
  osiIndexes.sort((a, b) => b - a).forEach((idx) => {
    if (idx >= 0 && idx < pnr.osi.length) pnr.osi.splice(idx, 1);
  });
  rmIndexes.sort((a, b) => b - a).forEach((idx) => {
    if (idx >= 0 && idx < pnr.remarks.length) pnr.remarks.splice(idx, 1);
  });
  opIndexes.sort((a, b) => b - a).forEach((idx) => {
    if (idx >= 0 && idx < pnr.options.length) pnr.options.splice(idx, 1);
  });
  if (cancelTk) pnr.tk = null;
  if (cancelFp) pnr.fp = null;
  if (cancelRf) pnr.rf = null;
}

function cancelPaxElement(state, element) {
  // kind === "PAX"
  {
    // 1) Interdit si TST présent (sinon incohérences multi-pax / pricing)
    if (state.tsts && state.tsts.length > 0) {
      return { error: "NOT ALLOWED - TST PRESENT" };
    }

    // 2) Règle Amadeus-like demandée: ne pas autoriser si un seul adulte
    const adtCount = (state.activePNR.passengers || []).filter(
      (p) => p && p.type === "ADT"
    ).length;

    if (adtCount <= 1) {
      return { error: "NOT ALLOWED - LAST ADT" };
    }

    // 3) Interdit si INF associé à ce pax
    // Hypothèse: tu stockes les INF avec un lien vers l’adulte (ex: p.type==="INF" et p.associatedTo === adultIndex)
    // OU tu as une relation similaire. Adapte le champ EXACT utilisé dans ton modèle.
    const paxIndex = element.ref.paxIndex; // à définir dans ton mapping buildElementIndex (index dans passengers)
    const hasAssociatedInf = (state.activePNR.passengers || []).some((p) => {
      if (!p) return false;
      if (p.type !== "INF") return false;
      // Adapte selon ton modèle:
      return p.associatedTo === paxIndex || p.associatedToPaxIndex === paxIndex;
    });

    if (hasAssociatedInf) {
      return { error: "NOT ALLOWED - INF ASSOCIATED" };
    }

    // 4) Annulation autorisée: supprimer le pax
    const nextPassengers = [...state.activePNR.passengers];
    nextPassengers.splice(paxIndex, 1);

    state.activePNR.passengers = nextPassengers;

    // 5) (Optionnel mais recommandé) nettoyer RF/contact etc si ton métier le demande
    // Ici on ne touche pas aux segments, AP, SSR/OSI car ils ne sont pas pax-linked dans ton modèle actuel.

    return { ok: true, message: "NAME CANCELLED" };
  }
}

// Optional: only validates city codes when deps.locations exposes findByIata
// (real usage via apps/web). Skipped when no such provider is configured, so
// packages/core tests that don't wire a locations provider keep working.
async function validateCityCodes(deps, from, to) {
  if (!deps?.locations || typeof deps.locations.findByIata !== "function") {
    return true;
  }
  const [fromLoc, toLoc] = await Promise.all([
    deps.locations.findByIata(from),
    deps.locations.findByIata(to),
  ]);
  return Boolean(fromLoc && toLoc);
}

async function handleAN(state, cmdUpper, deps, options = {}) {
  let dateObj = null;
  let from = null;
  let to = null;

  let m = cmdUpper.match(/^AN(\d{1,2}[A-Z]{3})([A-Z]{3})([A-Z]{3})$/);
  if (m) {
    dateObj = parseDDMMM(m[1], deps?.clock);
    from = m[2];
    to = m[3];
  } else {
    m = cmdUpper.match(/^AN([A-Z]{3})([A-Z]{3})\/(\d{1,2}[A-Z]{3})$/);
    if (m) {
      from = m[1];
      to = m[2];
      dateObj = parseDDMMM(m[3], deps?.clock);
    }
  }

  if (!m) {
    return { error: "CHECK FORMAT" };
  }
  if (!dateObj) {
    return { error: "CHECK DATE" };
  }
  if (!(await validateCityCodes(deps, from, to))) {
    return { error: "NOT IN TABLE" };
  }

  const ddmmm = formatDDMMM(dateObj);
  const dow = dayOfWeek2(dateObj);

  let results;
  if (
    deps?.availability &&
    typeof deps.availability.searchAvailability === "function"
  ) {
    const external = await deps.availability.searchAvailability({
      from,
      to,
      ddmmm,
      dow,
    });
    const valid =
      Array.isArray(external) &&
      external.every(
        (item) =>
          item &&
          typeof item.airline === "string" &&
          typeof item.flightNo !== "undefined" &&
          typeof item.depTime === "string" &&
          typeof item.arrTime === "string" &&
          typeof item.from === "string" &&
          typeof item.to === "string" &&
          typeof item.dateDDMMM === "string" &&
          typeof item.dow === "string" &&
          Array.isArray(item.bookingClasses)
      );
    if (!valid) {
      return { error: "CHECK FORMAT" };
    }
    results = external;
  } else if (options.availability && typeof options.availability.search === "function") {
    const external = await options.availability.search({ from, to, ddmmm, dow });
    const valid =
      Array.isArray(external) &&
      external.every(
        (item) =>
          item &&
          typeof item.airline === "string" &&
          typeof item.flightNo !== "undefined" &&
          typeof item.depTime === "string" &&
          typeof item.arrTime === "string" &&
          typeof item.from === "string" &&
          typeof item.to === "string" &&
          typeof item.dateDDMMM === "string" &&
          typeof item.dow === "string" &&
          Array.isArray(item.bookingClasses)
      );
    if (!valid) {
      return { error: "CHECK FORMAT" };
    }
    results = external;
  } else {
    results = buildOfflineAvailability({ from, to, ddmmm, dow });
  }

  state.lastAN = { query: { from, to, ddmmm, dow }, results };

  const lines = [];
  lines.push(`AN${ddmmm}${from}${to}`);
  lines.push(`** AMADEUS AVAILABILITY - AN ** ${to}`);
  results.forEach((r) => lines.push(...formatAvailabilityItem(r)));

  return { lines };
}

// Shared by plain AN and AC's re-displays (docs/COMMANDES-MANQUANTES.md
// Priorite 1): one flight's availability line(s), wrapping booking-class
// tokens across up to 3 lines exactly like AN always has.
function formatAvailabilityItem(r) {
  const ln = String(r.lineNo);
  const airline = padR(r.airline, 2);
  const fno = padL(String(r.flightNo), 4, "0");

  const tokens = r.bookingClasses.map((x) => `${x.code}${x.seats}`);
  const wrapped = wrapTokens(tokens, 8);
  const route = `/${r.from} ${r.to}`;

  const lines = [
    `${ln}  ${airline} ${fno}  ` + padR(wrapped[0].join(" "), 34) + ` ${route}`,
  ];
  if (wrapped[1]) lines.push(`     ${wrapped[1].join(" ")}`);
  if (wrapped[2]) lines.push(`     ${wrapped[2].join(" ")}`);
  return lines;
}

// MN/MY -- relaunch the last availability search shifted a day forward/back
// (docs/COMMANDES-MANQUANTES.md Priorite 1). Reuses state.lastAN.query
// (from/to/date/filters), which AN/TN/SN/SS long sell/SB/AC/SC all
// populate -- so this re-displays as a real AN, even if the last thing
// shown was e.g. a TN, and keeps any AC/SC filter still in effect.
async function handleMoveDay(state, deps, deltaDays) {
  if (!state.lastAN || !state.lastAN.query) return { error: "NO ACTIVE DISPLAY" };
  const base = state.lastAN.query;
  const dateObj = parseDDMMM(base.ddmmm, deps.clock);
  if (!dateObj) return { error: "NO ACTIVE DISPLAY" };
  dateObj.setDate(dateObj.getDate() + deltaDays);
  const criteria = {
    from: base.from,
    to: base.to,
    ddmmm: formatDDMMM(dateObj),
    airlineFilter: base.airlineFilter || null,
    classFilter: base.classFilter || null,
    minSeats: base.minSeats || null,
    afterTime: base.afterTime || null,
  };
  return runAvailabilityDisplay(state, deps, criteria, "AN");
}

// AC/SC -- modify the last availability search by exactly ONE delta,
// keeping every other criterion (docs/COMMANDES-MANQUANTES.md Priorite 1,
// spec arbitree par l'architecte 06/07/2026). AC always re-displays as an
// AN; SC always re-displays as an SN -- regardless of which command
// actually produced the criteria being modified. Parsing order is
// deterministic and matches the spec exactly (rule 1 -- ACR -- is handled
// by a separate function/dispatch entry, checked before this one).
async function handleAvailabilityChange(state, deps, rest, displayType) {
  if (!state.lastAN || !state.lastAN.query) return { error: "NO ACTIVE DISPLAY" };
  const base = state.lastAN.query;
  const criteria = {
    from: base.from,
    to: base.to,
    ddmmm: base.ddmmm,
    airlineFilter: base.airlineFilter || null,
    classFilter: base.classFilter || null,
    minSeats: base.minSeats || null,
    afterTime: base.afterTime || null,
  };

  let m;
  if ((m = rest.match(/^\/A([A-Z]{2})(?:,([A-Z]{2}))?(?:,([A-Z]{2}))?$/))) {
    criteria.airlineFilter = [m[1], m[2], m[3]].filter(Boolean);
  } else if ((m = rest.match(/^\/C([A-Z]{0,3})$/))) {
    if (m[1]) {
      const letters = m[1].split("");
      if (!letters.every((letter) => AVAILABLE_CLASS_CODES.includes(letter))) {
        return { error: "CHECK CLASS OF SERVICE" };
      }
      criteria.classFilter = letters;
    } else {
      criteria.classFilter = null;
    }
  } else if ((m = rest.match(/^\/B(\d{1,2})$/))) {
    criteria.minSeats = parseInt(m[1], 10);
  } else if ((m = rest.match(/^\/\/([A-Z]{3})$/))) {
    criteria.to = m[1];
  } else if ((m = rest.match(/^([A-Z]{6})$/))) {
    criteria.from = m[1].slice(0, 3);
    criteria.to = m[1].slice(3, 6);
  } else if ((m = rest.match(/^([A-Z]{3})$/))) {
    criteria.from = m[1];
  } else if ((m = rest.match(/^(\d{1,2}[A-Z]{3})$/))) {
    const dateObj = parseDDMMM(m[1], deps.clock);
    if (!dateObj) return { error: "CHECK DATE" };
    criteria.ddmmm = formatDDMMM(dateObj);
  } else if ((m = rest.match(/^(\d{4})$/))) {
    criteria.afterTime = m[1];
  } else if ((m = rest.match(/^([+-]?\d{1,2})$/))) {
    const dateObj = parseDDMMM(criteria.ddmmm, deps.clock);
    if (!dateObj) return { error: "CHECK DATE" };
    dateObj.setDate(dateObj.getDate() + parseInt(m[1], 10));
    criteria.ddmmm = formatDDMMM(dateObj);
  } else {
    return { error: "CHECK FORMAT" };
  }

  return runAvailabilityDisplay(state, deps, criteria, displayType);
}

// ACR -- return flights of the last availability search
// (docs/COMMANDES-MANQUANTES.md Priorite 1, spec arbitree par
// l'architecte): swaps cities, keeps every other criterion, defaults to
// departures from/after 18:00 the same day unless a time (and optionally a
// new date) is given. Always re-displays as an AN (same family as AC).
async function handleReturnAvailability(state, deps, rest) {
  if (!state.lastAN || !state.lastAN.query) return { error: "NO ACTIVE DISPLAY" };
  const base = state.lastAN.query;
  const criteria = {
    from: base.to,
    to: base.from,
    ddmmm: base.ddmmm,
    airlineFilter: base.airlineFilter || null,
    classFilter: base.classFilter || null,
    minSeats: base.minSeats || null,
    afterTime: "1800",
  };

  let m;
  if (rest === "") {
    // keep the default afterTime = "1800"
  } else if ((m = rest.match(/^(\d{1,2}[A-Z]{3})(\d{4})$/))) {
    const dateObj = parseDDMMM(m[1], deps.clock);
    if (!dateObj) return { error: "CHECK DATE" };
    criteria.ddmmm = formatDDMMM(dateObj);
    criteria.afterTime = m[2];
  } else if ((m = rest.match(/^(\d{4})$/))) {
    criteria.afterTime = m[1];
  } else {
    return { error: "CHECK FORMAT" };
  }

  return runAvailabilityDisplay(state, deps, criteria, "AN");
}

// Shared by MN/MY/AC/SC/ACR: fetches availability for the given criteria,
// applies whichever filters are set, stores the result as the new
// state.lastAN (so it stays addressable by SS and chainable by the next
// MN/MY/AC/SC/ACR/MD.../etc.), and renders it as the requested display
// type via the paginated state.lastDisplay.
async function runAvailabilityDisplay(state, deps, criteria, displayType) {
  if (!(await validateCityCodes(deps, criteria.from, criteria.to))) {
    return { error: "NOT IN TABLE" };
  }
  const dateObj = parseDDMMM(criteria.ddmmm, deps.clock);
  if (!dateObj) return { error: "CHECK DATE" };
  const ddmmm = formatDDMMM(dateObj);
  const dow = dayOfWeek2(dateObj);

  let results;
  if (
    deps?.availability &&
    typeof deps.availability.searchAvailability === "function"
  ) {
    const external = await deps.availability.searchAvailability({
      from: criteria.from,
      to: criteria.to,
      ddmmm,
      dow,
    });
    if (!Array.isArray(external)) return { error: "CHECK FORMAT" };
    results = external;
  } else {
    results = buildOfflineAvailability({ from: criteria.from, to: criteria.to, ddmmm, dow });
  }

  let normalized = [...results].sort((a, b) =>
    a.depTime === b.depTime
      ? String(a.airline).localeCompare(String(b.airline))
      : a.depTime.localeCompare(b.depTime)
  );

  if (criteria.airlineFilter && criteria.airlineFilter.length > 0) {
    normalized = normalized.filter((item) => criteria.airlineFilter.includes(item.airline));
  }
  if (criteria.classFilter && criteria.classFilter.length > 0) {
    normalized = normalized.filter((item) =>
      item.bookingClasses.some(
        (cls) => criteria.classFilter.includes(cls.code) && cls.seats > 0
      )
    );
  }
  if (criteria.minSeats) {
    normalized = normalized.filter((item) =>
      item.bookingClasses.some((cls) => cls.seats >= criteria.minSeats)
    );
  }
  if (criteria.afterTime) {
    normalized = normalized.filter((item) => item.depTime >= criteria.afterTime);
  }

  normalized = normalized.map((item, idx) => ({ ...item, lineNo: idx + 1 }));

  state.lastAN = {
    query: {
      from: criteria.from,
      to: criteria.to,
      ddmmm,
      dow,
      airlineFilter: criteria.airlineFilter,
      classFilter: criteria.classFilter,
      minSeats: criteria.minSeats,
      afterTime: criteria.afterTime,
    },
    results: normalized,
  };

  const lines =
    displayType === "AN"
      ? startPagedDisplay(state, {
          type: "AN",
          header: [
            `AN${ddmmm}${criteria.from}${criteria.to}`,
            `** AMADEUS AVAILABILITY - AN ** ${criteria.to}`,
          ],
          items: normalized.map((item) => formatAvailabilityItem(item)),
        })
      : startPagedDisplay(state, {
          type: "SN",
          header: [
            `SN${ddmmm}${criteria.from}${criteria.to}`,
            `** AMADEUS SCHEDULE - SN ** ${criteria.from}-${criteria.to}`,
          ],
          items: normalized.map((item) => [formatTimetableLine(item)]),
        });

  return { lines };
}

function handleSS(state, cmdUpper, clock) {
  if (!state.lastAN || !state.lastAN.results || state.lastAN.results.length === 0) {
    return { error: "NO AVAILABILITY" };
  }

  ensurePNR(state);

  const m = cmdUpper.match(/^SS(\d{1,2})([A-Z])(\d{0,2})$/);
  if (!m) {
    return { error: "CHECK FORMAT" };
  }

  const lineNo = parseInt(m[1], 10);
  const classCode = m[2];
  const paxCount = m[3] ? parseInt(m[3], 10) : 1;

  const item = state.lastAN.results.find((x) => x.lineNo === lineNo);
  if (!item) return { error: "NOT IN TABLE" };

  const cls = item.bookingClasses.find((x) => x.code === classCode);
  if (!cls) return { error: "CHECK CLASS OF SERVICE" };
  if (cls.seats <= 0) return { error: "NO SEATS" };
  if (paxCount > cls.seats) return { error: "NOT ENOUGH SEATS" };

  cls.seats -= paxCount;

  const seg = {
    airline: item.airline,
    flightNo: item.flightNo,
    classCode,
    dateDDMMM: item.dateDDMMM,
    from: item.from,
    to: item.to,
    depTime: item.depTime,
    arrTime: item.arrTime,
    status: "HK",
    paxCount,
  };

  state.activePNR.itinerary.push(seg);

  const lines = ["OK", ...renderPNRLiveView(state, clock)];
  return { lines };
}

// SS<airline><flightNo><class><ddMMM><from><to><pax> -- direct/"long" sell
// without a prior AN display (docs/COMMANDES-MANQUANTES.md Priorite 1).
// Runs the same availability lookup AN would have shown (and stores it in
// state.lastAN, exactly like AN does) so the sold flight/class is
// addressable afterwards -- by a follow-up numeric SS, and for inventory
// restitution on IG/IR/XI.
async function handleSSLongSell(state, cmdUpper, deps) {
  const m = cmdUpper.match(
    /^SS([A-Z]{2})(\d{1,4})([A-Z])(\d{1,2}[A-Z]{3})([A-Z]{3})([A-Z]{3})(\d{1,2})$/
  );
  if (!m) {
    return { error: "CHECK FORMAT" };
  }
  const [, airline, flightNoRaw, classCode, dateToken, from, to, paxToken] = m;
  const flightNo = parseInt(flightNoRaw, 10);
  const paxCount = parseInt(paxToken, 10);

  const dateObj = parseDDMMM(dateToken, deps?.clock);
  if (!dateObj) {
    return { error: "CHECK DATE" };
  }
  if (!(await validateCityCodes(deps, from, to))) {
    return { error: "NOT IN TABLE" };
  }

  const ddmmm = formatDDMMM(dateObj);
  const dow = dayOfWeek2(dateObj);

  let results;
  if (
    deps?.availability &&
    typeof deps.availability.searchAvailability === "function"
  ) {
    const external = await deps.availability.searchAvailability({
      from,
      to,
      ddmmm,
      dow,
    });
    if (!Array.isArray(external)) {
      return { error: "CHECK FORMAT" };
    }
    results = external;
  } else {
    results = buildOfflineAvailability({ from, to, ddmmm, dow });
  }

  state.lastAN = { query: { from, to, ddmmm, dow }, results };

  const item = results.find(
    (r) => r.airline === airline && Number(r.flightNo) === flightNo
  );
  if (!item) return { error: "NOT IN TABLE" };

  const cls = item.bookingClasses.find((x) => x.code === classCode);
  if (!cls) return { error: "CHECK CLASS OF SERVICE" };
  if (cls.seats <= 0) return { error: "NO SEATS" };
  if (paxCount > cls.seats) return { error: "NOT ENOUGH SEATS" };

  cls.seats -= paxCount;

  ensurePNR(state);
  const seg = {
    airline: item.airline,
    flightNo: item.flightNo,
    classCode,
    dateDDMMM: item.dateDDMMM,
    from: item.from,
    to: item.to,
    depTime: item.depTime,
    arrTime: item.arrTime,
    status: "HK",
    paxCount,
  };
  state.activePNR.itinerary.push(seg);

  const lines = ["OK", ...renderPNRLiveView(state, deps.clock)];
  return { lines };
}

// SB<...> -- rebook an existing segment (docs/COMMANDES-MANQUANTES.md
// Priorite 1): class (SBY6), date (SB12APR7), or flight (SBBA194*3),
// referencing the segment by its RT element number (same numbering XE
// already uses). Exact real Amadeus grammar not independently confirmed --
// implemented from the architect's 3 worked examples, flagged "a verifier"
// in docs/COMMANDES-MANQUANTES.md / AUDIT-COMMANDES.md pending Massy.
async function handleSB(state, cmdUpper, deps) {
  const pnr = state.activePNR;
  if (!pnr) return { error: "NO ACTIVE PNR" };

  let mode = null;
  let newClass = null;
  let newDateToken = null;
  let newAirline = null;
  let newFlightNoRaw = null;
  let segNo = null;

  let m = cmdUpper.match(/^SB([A-Z])(\d{1,2})$/);
  if (m) {
    mode = "class";
    newClass = m[1];
    segNo = parseInt(m[2], 10);
  } else {
    m = cmdUpper.match(/^SB(\d{1,2}[A-Z]{3})(\d{1,2})$/);
    if (m) {
      mode = "date";
      newDateToken = m[1];
      segNo = parseInt(m[2], 10);
    } else {
      m = cmdUpper.match(/^SB([A-Z]{2})(\d{1,4})\*(\d{1,2})$/);
      if (m) {
        mode = "flight";
        newAirline = m[1];
        newFlightNoRaw = m[2];
        segNo = parseInt(m[3], 10);
      }
    }
  }
  if (!mode) return { error: "CHECK FORMAT" };

  const elements = buildElementIndex(state, deps.clock);
  const target = elements.find(
    (e) => e.elementNo === segNo && e.kind === "SEG"
  );
  if (!target) return { error: "ELEMENT NOT FOUND" };
  const segment = pnr.itinerary[target.index];
  if (isSegmentCancelledStatus(segment.status)) {
    return { error: "ELEMENT NOT FOUND" };
  }

  const displayIndex = buildSegmentDisplayIndexByItineraryIndex(
    pnr,
    deps.clock
  ).get(target.index);
  const lockedByTst = (state.tsts || []).some(
    (tst) => Array.isArray(tst.segments) && tst.segments.includes(displayIndex)
  );
  if (lockedByTst) return { error: "NOT ALLOWED - TST SEGMENT" };

  const targetAirline = mode === "flight" ? newAirline : segment.airline;
  const targetFlightNo =
    mode === "flight" ? parseInt(newFlightNoRaw, 10) : segment.flightNo;
  const targetClass = mode === "class" ? newClass : segment.classCode;
  const dateToken = mode === "date" ? newDateToken : segment.dateDDMMM;

  const dateObj = parseDDMMM(dateToken, deps?.clock);
  if (!dateObj) return { error: "CHECK DATE" };
  const ddmmm = formatDDMMM(dateObj);
  const dow = dayOfWeek2(dateObj);

  // Reuse the already-loaded availability context when it already covers
  // this exact route/date (so any OTHER segment sold from the same
  // context keeps its own decremented seat count) -- only fetch a fresh
  // one when it doesn't match (e.g. a date rebook targeting a new day).
  const cachedContextMatches =
    state.lastAN &&
    state.lastAN.query &&
    state.lastAN.query.from === segment.from &&
    state.lastAN.query.to === segment.to &&
    state.lastAN.query.ddmmm === ddmmm;

  let results;
  if (cachedContextMatches) {
    results = state.lastAN.results;
  } else if (
    deps?.availability &&
    typeof deps.availability.searchAvailability === "function"
  ) {
    const external = await deps.availability.searchAvailability({
      from: segment.from,
      to: segment.to,
      ddmmm,
      dow,
    });
    if (!Array.isArray(external)) return { error: "CHECK FORMAT" };
    results = external;
  } else {
    results = buildOfflineAvailability({
      from: segment.from,
      to: segment.to,
      ddmmm,
      dow,
    });
  }

  const targetItem = results.find(
    (r) => r.airline === targetAirline && Number(r.flightNo) === targetFlightNo
  );
  if (!targetItem) return { error: "NOT IN TABLE" };

  const cls = targetItem.bookingClasses.find((x) => x.code === targetClass);
  if (!cls) return { error: "CHECK CLASS OF SERVICE" };
  if (cls.seats <= 0) return { error: "NO SEATS" };
  if (segment.paxCount > cls.seats) return { error: "NOT ENOUGH SEATS" };

  // Validated -- release the old segment's inventory using whatever
  // availability context state.lastAN still holds (best effort, same
  // pattern as IG/IR/XI restitution), THEN switch to the new context and
  // sell into it, so a same-context release never gets clobbered by the
  // rebook's own state.lastAN update below.
  releaseInventoryForSegments(state, [segment]);
  segment.status = "HX";

  state.lastAN = {
    query: { from: segment.from, to: segment.to, ddmmm, dow },
    results,
  };
  cls.seats -= segment.paxCount;

  const newSeg = {
    airline: targetItem.airline,
    flightNo: targetItem.flightNo,
    classCode: targetClass,
    dateDDMMM: targetItem.dateDDMMM,
    from: targetItem.from,
    to: targetItem.to,
    depTime: targetItem.depTime,
    arrTime: targetItem.arrTime,
    status: "HK",
    paxCount: segment.paxCount,
  };
  pnr.itinerary.push(newSeg);

  const lines = ["OK", ...renderPNRLiveView(state, deps.clock)];
  return { lines };
}

// <elementNo>/<newValue> -- modify a free-text/date PNR element in place,
// referenced by its RT element number (docs/COMMANDES-MANQUANTES.md
// Priorite 1: "5/NOUVEAU TEXTE", "8/12JUL"). Scoped to the element kinds
// that are plain free text or a bare date (RM, OSI, SSR, OP, TK) --
// segments are rebooked via SB (already more explicit about which
// dimension changes) and names via a future NU command, not this one;
// every other kind (PAX, SEG, AP, FP, RF, TKT, ITR, RECLOC) returns
// NOT ALLOWED rather than guessing an edit grammar for it.
function handleElementModify(state, cmdUpper, deps) {
  const m = cmdUpper.match(/^(\d{1,2})\/(.+)$/);
  if (!m) return { error: "CHECK FORMAT" };
  const elementNo = parseInt(m[1], 10);
  const newValue = m[2].trim();
  if (!newValue) return { error: "CHECK FORMAT" };

  const pnr = state.activePNR;
  if (!pnr) return { error: "NO ACTIVE PNR" };

  const elements = buildElementIndex(state, deps.clock);
  const target = elements.find((e) => e.elementNo === elementNo);
  if (!target) return { error: "ELEMENT NOT FOUND" };

  if (target.kind === "RM") {
    pnr.remarks[target.index] = newValue;
  } else if (target.kind === "OSI") {
    pnr.osi[target.index] = newValue;
  } else if (target.kind === "SSR") {
    pnr.ssr[target.index] = newValue;
  } else if (target.kind === "OP") {
    const option = pnr.options[target.index];
    const dateOnly = newValue.match(/^(\d{1,2}[A-Z]{3})$/);
    if (dateOnly) {
      const dateObj = parseDDMMM(dateOnly[1], deps.clock);
      if (!dateObj) return { error: "CHECK DATE" };
      option.date = formatDDMMM(dateObj);
    } else {
      option.text = newValue;
    }
  } else if (target.kind === "TK") {
    if (pnr.tk.kind === "OK") return { error: "NOT ALLOWED" };
    const dateObj = parseDDMMM(newValue, deps.clock);
    if (!dateObj) return { error: "CHECK DATE" };
    pnr.tk.date = formatDDMMM(dateObj);
  } else {
    return { error: "NOT ALLOWED" };
  }

  return { lines: ["OK", ...renderPNRLiveView(state, deps.clock)] };
}

// NU<pos>/<pos><LASTNAME>/<FIRSTNAME>[ TITLE] -- correct a passenger's name
// (docs/COMMANDES-MANQUANTES.md Priorite 1). The position is referenced
// twice (before and after the slash, mirroring NM's own "1SMITH/JOHN MR"
// convention) and must match -- a mismatch is treated as a format error
// rather than silently picking one. Blocked once a ticket has been issued
// on the PNR ("interdit apres emission" per the doc).
function handleNU(state, cmdUpper, deps) {
  const pnr = state.activePNR;
  if (!pnr) return { error: "NO ACTIVE PNR" };

  const m = cmdUpper.match(
    /^NU(\d{1,2})\/(\d{1,2})([A-Z'-]+)\/([A-Z'-]+)(?:\s+(MR|MRS))?$/
  );
  if (!m) return { error: "CHECK FORMAT" };

  const [, posRaw, posRepeatRaw, lastName, firstName, title] = m;
  if (posRaw !== posRepeatRaw) return { error: "CHECK FORMAT" };

  const hasIssuedTicket = (pnr.tickets || []).some(
    (ticket) => ticket.status !== "VOID"
  );
  if (hasIssuedTicket) return { error: "NOT ALLOWED" };

  const pos = parseInt(posRaw, 10);
  const passenger = pnr.passengers?.[pos - 1];
  if (!passenger) return { error: "ELEMENT NOT FOUND" };

  passenger.lastName = lastName;
  passenger.firstName = firstName;
  if (title) passenger.title = title;

  return { lines: ["OK", ...renderPNRLiveView(state, deps.clock)] };
}

// DL<n> -- TRUE deletion of a segment (docs/COMMANDES-MANQUANTES.md
// Priorite 1: "vs XE qui annule"). Scoped to segments only: every other
// element kind (RM/OSI/SSR/OP/AP/APE/TK/FP/RF) is already truly removed
// by XE's cancelElements (splice/null, not a historized marker) -- there is
// no real "vs XE" distinction left to make for those, so DL on a non-SEG
// element returns NOT ALLOWED and points at XE instead. Reuses XE's own
// segment-cancellation guards (TST lock, last active segment) and the same
// inventory restitution as IG/SB/XI, then removes the segment outright
// (no HX remnant, unlike XE).
function handleDL(state, cmdUpper, deps) {
  const pnr = state.activePNR;
  if (!pnr) return { error: "NO ACTIVE PNR" };

  const m = cmdUpper.match(/^DL(\d{1,2})$/);
  if (!m) return { error: "CHECK FORMAT" };

  const elementNo = parseInt(m[1], 10);
  const elements = buildElementIndex(state, deps.clock);
  const target = elements.find((e) => e.elementNo === elementNo);
  if (!target) return { error: "ELEMENT NOT FOUND" };
  if (target.kind !== "SEG") return { error: "NOT ALLOWED" };

  const validation = validateSegmentCancellation(state, [target], deps.clock);
  if (validation.error) return { error: validation.error };

  const segment = pnr.itinerary[target.index];
  releaseInventoryForSegments(state, [segment]);
  pnr.itinerary.splice(target.index, 1);

  return { lines: ["OK", ...renderPNRLiveView(state, deps.clock)] };
}

// SI ARNK -- neutral continuity segment for an "arrival unknown" gap in the
// itinerary (docs/COMMANDES-MANQUANTES.md Priorite 1). No flight/date/city
// data: just an itinerary placeholder, appended after whatever segments
// already exist (real usage: add it right after noticing the gap, before
// selling the next, disconnected leg).
function handleSIArnk(state, cmdUpper, deps) {
  if (!/^SI\s*ARNK$/.test(cmdUpper)) return { error: "CHECK FORMAT" };

  ensurePNR(state);
  state.activePNR.itinerary.push({ type: "ARNK", status: "HK", paxCount: 1 });

  return { lines: ["OK", ...renderPNRLiveView(state, deps.clock)] };
}

function formatTimetableLine(item) {
  return `${item.lineNo}  ${padR(item.airline, 2)} ${padL(
    String(item.flightNo),
    4,
    "0"
  )}  ${item.dateDDMMM}  ${item.from}${item.to}  ${item.depTime}-${item.arrTime} ${item.dow}`;
}

// Pagination is CORE state (state.lastDisplay), not something the UI
// recomputes (docs/COMMANDES-MANQUANTES.md Priorite 1, MD/MU/MT/MB
// "principe d'architecture"). A paginated command stores its header
// (always shown) and its items -- each item is the array of 1+ lines it
// takes on screen (a plain TN/SN entry is one line; an AN-style entry can
// wrap to up to 3) -- then only the current page's slice of ITEMS (not raw
// lines) is ever printed, unlike the old behavior of dumping every page in
// one go.
function startPagedDisplay(state, { type, header, items, pageSize = 5 }) {
  state.lastDisplay = { type, header, items, pageSize, page: 1 };
  return renderCurrentDisplayPage(state);
}

function renderCurrentDisplayPage(state) {
  const display = state.lastDisplay;
  if (!display) return [];
  const totalPages = Math.max(1, Math.ceil(display.items.length / display.pageSize));
  const lines = [...display.header];
  if (totalPages > 1) {
    lines.push(`PAGE ${display.page}/${totalPages}`);
  }
  const start = (display.page - 1) * display.pageSize;
  const pageItems = display.items.slice(start, start + display.pageSize);
  pageItems.forEach((itemLines) => lines.push(...itemLines));
  return lines;
}

// MD/MU/MT/MB -- scroll the current paginated display. Boundaries clamp
// (MD on the last page / MU on the first just reprint it) rather than
// erroring: real Amadeus wording for that edge case isn't confirmed, and
// clamping is the simplest, safest default (CONSTITUTION SS8).
function handleDisplayNav(state, direction) {
  const display = state.lastDisplay;
  if (!display) return { error: "NO ACTIVE DISPLAY" };
  const totalPages = Math.max(1, Math.ceil(display.items.length / display.pageSize));
  if (direction === "down") display.page = Math.min(display.page + 1, totalPages);
  else if (direction === "up") display.page = Math.max(display.page - 1, 1);
  else if (direction === "top") display.page = 1;
  else if (direction === "bottom") display.page = totalPages;
  return { lines: renderCurrentDisplayPage(state) };
}

async function handleTN(state, cmdUpper, deps) {
  let dateObj = null;
  let from = null;
  let to = null;

  let m = cmdUpper.match(/^TN(\d{1,2}[A-Z]{3})([A-Z]{3})([A-Z]{3})$/);
  if (m) {
    dateObj = parseDDMMM(m[1], deps?.clock);
    from = m[2];
    to = m[3];
  } else {
    m = cmdUpper.match(/^TN\s+(\d{1,2}[A-Z]{3})\s+([A-Z]{3})\s+([A-Z]{3})$/);
    if (m) {
      dateObj = parseDDMMM(m[1], deps?.clock);
      from = m[2];
      to = m[3];
    }
  }

  if (!m) {
    return { error: "CHECK FORMAT" };
  }
  if (!dateObj) {
    return { error: "CHECK DATE" };
  }
  if (!(await validateCityCodes(deps, from, to))) {
    return { error: "NOT IN TABLE" };
  }

  const ddmmm = formatDDMMM(dateObj);
  const dow = dayOfWeek2(dateObj);

  let results;
  if (deps?.timetable && typeof deps.timetable.searchTimetable === "function") {
    results = await deps.timetable.searchTimetable({ from, to, ddmmm, dow });
  } else if (
    deps?.availability &&
    typeof deps.availability.searchAvailability === "function"
  ) {
    results = await deps.availability.searchAvailability({ from, to, ddmmm, dow });
  } else {
    results = buildOfflineAvailability({ from, to, ddmmm, dow });
  }

  const valid =
    Array.isArray(results) &&
    results.every(
      (item) =>
        item &&
        typeof item.airline === "string" &&
        typeof item.flightNo !== "undefined" &&
        typeof item.depTime === "string" &&
        typeof item.arrTime === "string" &&
        typeof item.from === "string" &&
        typeof item.to === "string" &&
        typeof item.dateDDMMM === "string" &&
        typeof item.dow === "string" &&
        Array.isArray(item.bookingClasses)
    );
  if (!valid) {
    return { error: "CHECK FORMAT" };
  }

  const normalized = [...results]
    .sort((a, b) =>
      a.depTime === b.depTime
        ? String(a.airline).localeCompare(String(b.airline))
        : a.depTime.localeCompare(b.depTime)
    )
    .map((item, idx) => ({ ...item, lineNo: idx + 1 }));

  state.lastAN = { query: { from, to, ddmmm, dow }, results: normalized };

  const lines = startPagedDisplay(state, {
    type: "TN",
    header: [`TN${ddmmm}${from}${to}`, `** AMADEUS TIMETABLE - TN ** ${from}-${to}`],
    items: normalized.map((item) => [formatTimetableLine(item)]),
  });
  return { lines };
}

async function handleSN(state, cmdUpper, deps) {
  let dateObj = null;
  let from = null;
  let to = null;

  let m = cmdUpper.match(/^SN(\d{1,2}[A-Z]{3})([A-Z]{3})([A-Z]{3})$/);
  if (m) {
    dateObj = parseDDMMM(m[1], deps?.clock);
    from = m[2];
    to = m[3];
  } else {
    m = cmdUpper.match(/^SN\s+(\d{1,2}[A-Z]{3})\s+([A-Z]{3})\s+([A-Z]{3})$/);
    if (m) {
      dateObj = parseDDMMM(m[1], deps?.clock);
      from = m[2];
      to = m[3];
    }
  }

  if (!m) {
    return { error: "CHECK FORMAT" };
  }
  if (!dateObj) {
    return { error: "CHECK DATE" };
  }
  if (!(await validateCityCodes(deps, from, to))) {
    return { error: "NOT IN TABLE" };
  }

  const ddmmm = formatDDMMM(dateObj);
  const dow = dayOfWeek2(dateObj);

  let results;
  if (deps?.timetable && typeof deps.timetable.searchTimetable === "function") {
    results = await deps.timetable.searchTimetable({ from, to, ddmmm, dow });
  } else if (
    deps?.availability &&
    typeof deps.availability.searchAvailability === "function"
  ) {
    results = await deps.availability.searchAvailability({ from, to, ddmmm, dow });
  } else {
    results = buildOfflineAvailability({ from, to, ddmmm, dow });
  }

  const valid =
    Array.isArray(results) &&
    results.every(
      (item) =>
        item &&
        typeof item.airline === "string" &&
        typeof item.flightNo !== "undefined" &&
        typeof item.depTime === "string" &&
        typeof item.arrTime === "string" &&
        typeof item.from === "string" &&
        typeof item.to === "string" &&
        typeof item.dateDDMMM === "string" &&
        typeof item.dow === "string" &&
        Array.isArray(item.bookingClasses)
    );
  if (!valid) {
    return { error: "CHECK FORMAT" };
  }

  const normalized = [...results]
    .sort((a, b) =>
      a.depTime === b.depTime
        ? String(a.airline).localeCompare(String(b.airline))
        : a.depTime.localeCompare(b.depTime)
    )
    .map((item, idx) => ({ ...item, lineNo: idx + 1 }));

  state.lastAN = { query: { from, to, ddmmm, dow }, results: normalized };

  const lines = startPagedDisplay(state, {
    type: "SN",
    header: [`SN${ddmmm}${from}${to}`, `** AMADEUS SCHEDULE - SN ** ${from}-${to}`],
    items: normalized.map((item) => [formatTimetableLine(item)]),
  });
  return { lines };
}

function buildSegmentDisplayIndexByItineraryIndex(pnr, clock) {
  const itinerary = pnr.itinerary || [];
  const decorated = itinerary.map((segment, index) => {
    const dateObj = ddmmmToDate(segment.dateDDMMM, clock);
    const timeValue = dateObj ? dateObj.getTime() : Number.POSITIVE_INFINITY;
    return { index, timeValue };
  });
  decorated.sort((a, b) =>
    a.timeValue !== b.timeValue ? a.timeValue - b.timeValue : a.index - b.index
  );
  const displayByIndex = new Map();
  decorated.forEach((item, sortedIndex) => {
    displayByIndex.set(item.index, sortedIndex + 1);
  });
  return displayByIndex;
}

function isSegmentCancelledStatus(status) {
  const normalized = String(status || "HK").toUpperCase();
  return normalized === "HX" || normalized === "XX";
}

function filterActiveSegmentElements(state, segmentElements) {
  const pnr = state.activePNR;
  if (!pnr) return [];
  return segmentElements.filter((element) => {
    const segment = pnr.itinerary?.[element.index];
    if (!segment) return false;
    return !isSegmentCancelledStatus(segment.status);
  });
}

function validateSegmentCancellation(state, segmentElements, clock) {
  const pnr = state.activePNR;
  if (!pnr) return { error: "NO ACTIVE PNR" };
  if (!segmentElements.length) return { error: "NO SEGMENTS" };

  const displayByIndex = buildSegmentDisplayIndexByItineraryIndex(pnr, clock);
  for (const element of segmentElements) {
    const displayIndex = displayByIndex.get(element.index);
    const lockedByTst = (state.tsts || []).some(
      (tst) => Array.isArray(tst.segments) && tst.segments.includes(displayIndex)
    );
    if (lockedByTst) {
      return { error: "NOT ALLOWED - TST SEGMENT" };
    }
  }

  const activeSegmentIndexes = (pnr.itinerary || [])
    .map((segment, index) => ({ segment, index }))
    .filter((entry) => !isSegmentCancelledStatus(entry.segment.status))
    .map((entry) => entry.index);

  if ((pnr.passengers || []).length === 1) {
    const activeSet = new Set(activeSegmentIndexes);
    const targetedActiveIndexes = new Set(
      segmentElements
        .map((element) => element.index)
        .filter((index) => activeSet.has(index))
    );
    if (activeSet.size > 0 && activeSet.size - targetedActiveIndexes.size === 0) {
      return { error: "NOT ALLOWED - LAST SEGMENT" };
    }
  }

  return { ok: true };
}

function markSegmentElementsCancelled(state, segmentElements, cancelledStatus = "HX") {
  const pnr = state.activePNR;
  if (!pnr) return;
  const indexes = Array.from(new Set(segmentElements.map((element) => element.index)));
  for (const index of indexes) {
    if (index >= 0 && index < pnr.itinerary.length) {
      pnr.itinerary[index].status = cancelledStatus;
    }
  }
}

function handleXE(state, cmdUpper, clock) {
  if (!state.activePNR) {
    return { error: "NO ACTIVE PNR" };
  }
  const elements = buildElementIndex(state, clock);
  const cancellableKinds = new Set([
    "SEG",
    "AP",
    "APE",
    "SSR",
    "OSI",
    "RM",
    "OP",
    "TK",
    "FP",
    "RF",
    "PAX",
  ]);
  const segmentElements = elements.filter((el) => el.kind === "SEG");

  if (cmdUpper === "XEALL") {
    if (segmentElements.length === 0) return { error: "NO SEGMENTS" };
    const activeSegmentElements = filterActiveSegmentElements(state, segmentElements);
    if (activeSegmentElements.length === 0) return { error: "NO SEGMENTS" };
    const validation = validateSegmentCancellation(state, activeSegmentElements, clock);
    if (validation.error) return { error: validation.error };
    markSegmentElementsCancelled(state, activeSegmentElements);
    return {
      lines: ["OK", "ITINERARY CANCELLED", ...renderPNRLiveView(state, clock)],
    };
  }

  let m = cmdUpper.match(/^XE(\d{1,3})$/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n < 1 || n > elements.length) return { error: "ELEMENT NOT FOUND" };
    const element = elements[n - 1];
    if (element.kind === "SEG") {
      const activeSegmentSelections = filterActiveSegmentElements(state, [element]);
      if (activeSegmentSelections.length === 0) return { error: "NOTHING TO CANCEL" };
      const validation = validateSegmentCancellation(
        state,
        activeSegmentSelections,
        clock
      );
      if (validation.error) return { error: validation.error };
      markSegmentElementsCancelled(state, activeSegmentSelections);
      return {
        lines: ["OK", "SEGMENT CANCELLED", ...renderPNRLiveView(state, clock)],
      };
    }
    if (element.kind === "PAX") {
      const paxResult = cancelPaxElement(state, element);
      if (paxResult && paxResult.error) return { error: paxResult.error };
      return {
        lines: ["OK", paxResult.message, ...renderPNRLiveView(state, clock)],
      };
    }
    if (!cancellableKinds.has(element.kind)) return { error: "NOT ALLOWED" };
    cancelElements(state, [element]);
    return {
      lines: ["OK", "ELEMENT CANCELLED", ...renderPNRLiveView(state, clock)],
    };
  }

  m = cmdUpper.match(/^XE(\d{1,3})-(\d{1,3})$/);
  if (m) {
    let a = parseInt(m[1], 10);
    let b = parseInt(m[2], 10);
    if (a > b) [a, b] = [b, a];
    if (a < 1 || b > elements.length) return { error: "ELEMENT NOT FOUND" };
    const selected = elements.slice(a - 1, b);
    if (selected.some((el) => !cancellableKinds.has(el.kind))) {
      return { error: "NOT ALLOWED" };
    }
    const segmentSelections = selected.filter((el) => el.kind === "SEG");
    const activeSegmentSelections = filterActiveSegmentElements(
      state,
      segmentSelections
    );
    if (activeSegmentSelections.length > 0) {
      const validation = validateSegmentCancellation(
        state,
        activeSegmentSelections,
        clock
      );
      if (validation.error) return { error: validation.error };
    }
    let changed = false;
    const paxElements = selected
      .filter((el) => el.kind === "PAX")
      .sort((left, right) => right.ref.paxIndex - left.ref.paxIndex);
    for (const paxElement of paxElements) {
      const paxResult = cancelPaxElement(state, paxElement);
      if (paxResult && paxResult.error) return { error: paxResult.error };
      changed = true;
    }
    if (activeSegmentSelections.length > 0) {
      markSegmentElementsCancelled(state, activeSegmentSelections);
      changed = true;
    }
    const otherElements = selected.filter(
      (el) => el.kind !== "PAX" && el.kind !== "SEG"
    );
    if (otherElements.length > 0) {
      cancelElements(state, otherElements);
      changed = true;
    }
    if (!changed) return { error: "NOTHING TO CANCEL" };
    return {
      lines: ["OK", "ELEMENTS CANCELLED", ...renderPNRLiveView(state, clock)],
    };
  }

  return { error: "CHECK FORMAT" };
}

export function createInitialState() {
  return {
    activePNR: null,
    lastAN: null,
    lastDisplay: null,
    commandHistory: [],
    tsts: [],
    lastTstId: 0,
    lastTicketSeq: 0,
    pnrStore: {},
    recordedSnapshot: null,
    queueStore: {},
    activeQueue: null,
    currentQueueItem: null,
  };
}

function buildDefaultDeps() {
  const fallbackRng = createSeededRandom("DEFAULT_DEPS_RNG");
  const rng = () => fallbackRng();
  const availability = createSimAvailabilityProvider({ buildOfflineAvailability });
  const clock = {
    now: () => new Date(),
    today: () => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    },
    todayUTC: () => {
      const now = new Date();
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    },
  };
  return {
    availability,
    timetable: {
      searchTimetable: ({ from, to, ddmmm, dow }) =>
        availability.searchAvailability({ from, to, ddmmm, dow }),
    },
    pricing: createSimPricingProvider({ buildPricingData }),
    clock,
    rng,
    locations: null,
  };
}

function resolveDeps(options = {}) {
  const defaults = buildDefaultDeps();
  const provided = options.deps || {};
  const clockNow =
    provided.clock && typeof provided.clock.now === "function"
      ? provided.clock.now
      : defaults.clock.now;
  const resolvedClock = {
    now: clockNow,
    today:
      provided.clock && typeof provided.clock.today === "function"
        ? provided.clock.today
        : defaults.clock.today,
    todayUTC:
      provided.clock && typeof provided.clock.todayUTC === "function"
        ? provided.clock.todayUTC
        : defaults.clock.todayUTC,
  };
  let resolvedRng = defaults.rng;
  if (typeof provided.rng === "function") {
    resolvedRng = provided.rng;
  } else if (provided.rng && typeof provided.rng.nextFloat === "function") {
    resolvedRng = () => provided.rng.nextFloat();
  }
  const rawLocationsProvider = provided.locations || options.locations || null;
  let resolvedLocations = null;
  if (rawLocationsProvider) {
    if (
      typeof rawLocationsProvider.decodeIata === "function" &&
      typeof rawLocationsProvider.searchByText === "function"
    ) {
      resolvedLocations = rawLocationsProvider;
    } else if (
      typeof rawLocationsProvider.cmdDAC === "function" &&
      typeof rawLocationsProvider.cmdDAN === "function"
    ) {
      resolvedLocations = {
        decodeIata: (code) => rawLocationsProvider.cmdDAC(code),
        searchByText: (text) => rawLocationsProvider.cmdDAN(text),
        findByIata:
          typeof rawLocationsProvider.findByIata === "function"
            ? (code) => rawLocationsProvider.findByIata(code)
            : undefined,
      };
    } else if (typeof rawLocationsProvider.findByIata === "function") {
      // Provider only supports existence checks (used by AN/TN/SN city-code
      // validation), not the full DAC/DAN decode/search contract.
      resolvedLocations = {
        findByIata: (code) => rawLocationsProvider.findByIata(code),
      };
    }
  }
  return {
    availability: provided.availability || defaults.availability,
    timetable:
      provided.timetable && typeof provided.timetable.searchTimetable === "function"
        ? provided.timetable
        : defaults.timetable,
    pricing: provided.pricing || defaults.pricing,
    clock: resolvedClock,
    rng: resolvedRng,
    locations: resolvedLocations,
  };
}

// Shared by TWD (display) and TWX (void) -- same resolution rule the old
// single VOID command used: an explicit ticket number, or else the most
// recently issued non-void ticket.
function resolveTicketForDisplayOrVoid(pnr, requestedNumber) {
  return requestedNumber
    ? pnr.tickets.find((item) => item.ticketNumber === requestedNumber)
    : [...pnr.tickets].reverse().find((item) => item.status !== "VOID");
}

function findAvailabilityClass(state, seg) {
  if (!state.lastAN || !state.lastAN.results) return null;
  const item = state.lastAN.results.find(
    (r) =>
      r.airline === seg.airline &&
      r.flightNo === seg.flightNo &&
      r.dateDDMMM === seg.dateDDMMM &&
      r.from === seg.from &&
      r.to === seg.to
  );
  if (!item) return null;
  return item.bookingClasses.find((cls) => cls.code === seg.classCode) || null;
}

// Best-effort restitution of seats sold via SS when a segment is discarded
// without ever being (or staying) part of a recorded PNR -- IG/IR/XI on an
// unrecorded PNR or its unrecorded tail (segments sold after the last ER).
// No-op if the availability context has since changed (a later AN replaced
// state.lastAN): there is nothing safe to restore inventory into then.
function releaseInventoryForSegments(state, segments) {
  if (!segments || segments.length === 0) return;
  for (const seg of segments) {
    if (isSegmentCancelledStatus(seg.status)) continue;
    const cls = findAvailabilityClass(state, seg);
    if (cls) cls.seats += seg.paxCount || 1;
  }
}

// How many of the CURRENT PNR's own itinerary segments are already covered
// by its own last recorded snapshot (0 if it was never recorded at all).
function peekRecordedItineraryLength(state, locator) {
  if (!locator) return 0;
  const stored = state.pnrStore && state.pnrStore[locator];
  if (stored && stored.pnrSnapshot) return stored.pnrSnapshot.itinerary?.length || 0;
  if (state.recordedSnapshot && state.recordedSnapshot.recordLocator === locator) {
    return state.recordedSnapshot.pnrSnapshot?.itinerary?.length || 0;
  }
  return 0;
}

// Segments sold on the CURRENT active PNR since its own last save (all of
// them if it was never recorded) -- always relative to the PNR's OWN record
// locator, never to whatever other PNR a command like `IR <LOCATOR>` may be
// about to switch to (a different, already-valid PNR's own segments must
// never be released just because we're navigating away from it).
function computeUnrecordedTailSegments(state) {
  if (!state.activePNR) return [];
  const keptLength = peekRecordedItineraryLength(state, state.activePNR.recordLocator);
  return state.activePNR.itinerary.slice(keptLength);
}

// Shared by ER and ET (End Transaction, a twin of ER -- see the ET/TTP
// dispatch below): validates the active PNR, generates/reuses its record
// locator, promotes CREATED TSTs to VALIDATED, and stores the recorded
// snapshot. Only the caller decides whether to redisplay the PNR
// afterward (ER does; ET does not).
function recordPnr(state, deps) {
  const pnr = state.activePNR;
  if (!pnr) return { error: "NO ACTIVE PNR" };
  if (pnr.cancelRequested) {
    if (pnr.recordLocator && state.pnrStore) {
      delete state.pnrStore[pnr.recordLocator];
    }
    if (
      state.recordedSnapshot &&
      state.recordedSnapshot.recordLocator === pnr.recordLocator
    ) {
      state.recordedSnapshot = null;
    }
    state.activePNR = null;
    state.tsts = [];
    return { cancelled: true };
  }
  if (!pnr.passengers.length) return { error: "END PNR FIRST" };
  if (!pnr.contacts.length) return { error: "END PNR FIRST" };
  if (!pnr.rf) return { error: "END PNR FIRST" };

  if (!pnr.recordLocator) {
    pnr.recordLocator = generateRecordLocator(pnr);
  }
  pnr.status = "RECORDED";
  if (state.tsts && state.tsts.length > 0) {
    state.tsts = state.tsts.map((tst) =>
      tst.status === "CREATED" ? { ...tst, status: "VALIDATED" } : tst
    );
  }
  rebuildPnrElements(pnr, deps.clock);
  state.pnrStore ||= {};
  state.pnrStore[pnr.recordLocator] = {
    pnrSnapshot: deepCopy(pnr),
    tstsSnapshot: deepCopy(state.tsts),
  };
  state.recordedSnapshot = {
    recordLocator: pnr.recordLocator,
    pnrSnapshot: deepCopy(pnr),
    tstsSnapshot: deepCopy(state.tsts),
  };
  return { recordLocator: pnr.recordLocator };
}

function resolveRecordedLocator(state, preferredLocator = null) {
  if (preferredLocator) return String(preferredLocator).toUpperCase();
  // Deliberately scoped to the CURRENT active PNR's own record locator only
  // (never a session-wide "last recorded PNR, whatever it was" pointer): a
  // global fallback here used to resurrect an unrelated, already-exited PNR
  // when the current one was never recorded (bug reported by Massy, fixed
  // 06/07/2026 -- see PROJECT_MEMORY §2.2 transactional state matrix).
  if (state.activePNR && state.activePNR.recordLocator) {
    return state.activePNR.recordLocator;
  }
  if (state.recordedSnapshot && state.recordedSnapshot.recordLocator) {
    return state.recordedSnapshot.recordLocator;
  }
  return null;
}

function restoreRecordedState(state, locator) {
  if (!locator) return false;
  state.pnrStore ||= {};
  const stored = state.pnrStore[locator];
  let pnrSnapshot = null;
  let tstsSnapshot = [];

  // Source of truth: store by record locator. Snapshot is fallback only.
  if (stored) {
    pnrSnapshot = stored.pnrSnapshot;
    tstsSnapshot = stored.tstsSnapshot || [];
  } else if (
    state.recordedSnapshot &&
    state.recordedSnapshot.recordLocator === locator
  ) {
    pnrSnapshot = state.recordedSnapshot.pnrSnapshot;
    tstsSnapshot = state.recordedSnapshot.tstsSnapshot || [];
  } else {
    return false;
  }

  state.activePNR = deepCopy(pnrSnapshot);
  state.tsts = deepCopy(tstsSnapshot) || [];
  state.recordedSnapshot = {
    recordLocator: locator,
    pnrSnapshot: deepCopy(pnrSnapshot),
    tstsSnapshot: deepCopy(tstsSnapshot) || [],
  };
  return true;
}

export async function processCommand(state, cmd, options = {}) {
  /*
   * deps contract (in options.deps):
   * - deps.clock.now(): returns current Date
   * - deps.rng(): returns float in [0, 1)
   * Missing deps are auto-filled with simulation-safe defaults.
   */
  const deps = resolveDeps(options);
  const ERROR_EVENT_TEXTS = new Set([
    "CHECK FORMAT",
    "CHECK DATE",
    "CHECK CLASS OF SERVICE",
    "NOT IN TABLE",
    "NO ACTIVE PNR",
    "NO ITINERARY",
    "NO AVAILABILITY",
    "NO SEATS",
    "NOT ENOUGH SEATS",
    "PNR NOT FOUND",
    "END PNR FIRST",
    "ELEMENT NOT FOUND",
    "NOT ALLOWED",
    "NOT ALLOWED - TST PRESENT",
    "NOT ALLOWED - TST SEGMENT",
    "NOT ALLOWED - LAST SEGMENT",
    "NOT ALLOWED - LAST ADT",
    "NOT ALLOWED - INF ASSOCIATED",
    "NOTHING TO CANCEL",
    "FUNCTION NOT APPLICABLE",
    "NO TST",
    "NO NAME",
    "NO TICKET",
    "NO EMAIL ADDRESS",
    "TICKET ALREADY ISSUED",
    "NO SEGMENTS",
    "QUEUE NOT FOUND",
    "NO ACTIVE QUEUE",
    "NO CURRENT QUEUE ITEM",
    "NO RECORDED PNR",
    "NO FORM OF PAYMENT",
    "LOCATION PROVIDER NOT CONFIGURED",
    "HELP NOT FOUND",
    "NO ACTIVE DISPLAY",
    "NO PREVIOUS ENTRY",
  ]);
  const events = [];
  const error = (text) => events.push({ type: "error", text: String(text) });
  const print = (text) => {
    const value = String(text);
    if (ERROR_EVENT_TEXTS.has(value)) {
      error(value);
      return;
    }
    events.push({ type: "print", text: value });
  };
  const raw = (cmd || "").trim();
  const c = raw.toUpperCase();
  if (!c) return { events, state };

  // RE/RE2/... -- recall and re-run the Nth-last entry (docs/COMMANDES-
  // MANQUANTES.md Priorite 1, missions/MISSION-16.md item 6): input
  // history is CORE state (state.commandHistory), like state.lastDisplay.
  // RE itself is never recorded as an entry (recalling "RE" would just
  // recall whatever it last recalled, which is confusing) -- every other
  // command is, right here, before dispatch.
  const recallMatch = c.match(/^RE(\d{1,2})?$/);
  if (!recallMatch) {
    state.commandHistory ||= [];
    state.commandHistory.push(c);
  } else {
    const n = recallMatch[1] ? parseInt(recallMatch[1], 10) : 1;
    const history = state.commandHistory || [];
    const target = history[history.length - n];
    if (!target) {
      print("NO PREVIOUS ENTRY");
      return { events, state };
    }
    print(target);
    const replay = await processCommand(state, target, options);
    events.push(...replay.events);
    return { events, state };
  }

  if (c === "AN") {
    print("AMADEUS SELLING PLATFORM");
    print("TRAINING MODE");
    return { events, state };
  }

  if (c === "JD") {
    const now = deps.clock.now();
    print(new Date(now).toDateString().toUpperCase());
    return { events, state };
  }

  if (c === "HE" || c.startsWith("HE ")) {
    const subject = raw.slice(2).trim().toUpperCase();
    if (!subject) {
      print("HELP - AVAILABLE COMMANDS");
      print("AN/TN/SN            AVAILABILITY AND SCHEDULE");
      print("SS / SB / XE        SELL, REBOOK OR CANCEL SEGMENTS");
      print("NM AP APE RF ER RT  PNR BUILD AND DISPLAY");
      print("FXP FXX FXR FXB     PRICING");
      print("ET TTP TWD TWX      TICKETING");
      print("HE <COMMAND>        COMMAND HELP (ex: HE AN)");
      return { events, state };
    }
    if (subject === "AN") {
      print("HE AN");
      print("ANddMMMXXXYYY       AVAILABILITY");
      print("ANXXXYYY/ddMMM      AVAILABILITY");
      print("EX: AN26DECALGPAR");
      return { events, state };
    }
    if (subject === "SS") {
      print("HE SS");
      print("SSnCn[pax]          SELL FROM LAST AN");
      print("EX: SS1Y1");
      print("SSAABBBBCddMMMXXXYYYn  LONG SELL (NO PRIOR AN)");
      print("EX: SSAF950C12DECCDGBRU1");
      return { events, state };
    }
    if (subject === "SB") {
      print("HE SB");
      print("SBCn                REBOOK CLASS (ex: SBY6)");
      print("SBddMMMn            REBOOK DATE (ex: SB12APR7)");
      print("SBAABBBB*n          REBOOK FLIGHT (ex: SBBA194*3)");
      print("n = SEGMENT'S RT ELEMENT NUMBER");
      return { events, state };
    }
    if (subject === "MODIFY") {
      print("HE MODIFY");
      print("n/TEXT              MODIFY RM/OSI/SSR/OP TEXT BY RT ELEMENT #");
      print("n/ddMMM             MODIFY OP/TKTL/TKXL DATE BY RT ELEMENT #");
      print("EX: 5/NEW REMARK TEXT");
      return { events, state };
    }
    if (subject === "NM") {
      print("HE NM");
      print("NM1NAME/FIRST MR    ADD PASSENGER");
      print("NM2NAME1/FIRST1 NAME2/FIRST2");
      return { events, state };
    }
    if (subject === "NU") {
      print("HE NU");
      print("NUn/nNAME/FIRST MR  CORRECT PASSENGER NAME");
      print("EX: NU1/1SMITH/JOHN MR");
      print("BLOCKED ONCE A TICKET IS ISSUED");
      return { events, state };
    }
    if (subject === "DL") {
      print("HE DL");
      print("DLn                 DELETE SEGMENT (RT ELEMENT #)");
      print("EX: DL4");
      print("OTHER ELEMENTS: USE XE (ALREADY A TRUE DELETE)");
      return { events, state };
    }
    if (subject === "SI") {
      print("HE SI");
      print("SI ARNK             CONTINUITY GAP (ARRIVAL UNKNOWN)");
      print("NEUTRAL ITINERARY PLACEHOLDER, NO FLIGHT/DATE");
      return { events, state };
    }
    if (subject === "ER" || subject === "RT" || subject === "ET") {
      print(`HE ${subject}`);
      if (subject === "ER") print("ER                  END AND RECORD PNR");
      if (subject === "RT") print("RT                  DISPLAY ACTIVE PNR");
      if (subject === "ET") {
        print("ET                  END TRANSACTION (LIKE ER, NO REDISPLAY)");
        print("DOES NOT ISSUE A TICKET -- USE TTP");
      }
      return { events, state };
    }
    if (subject === "FXP" || subject === "TTP") {
      print(`HE ${subject}`);
      if (subject === "FXP") print("FXP                 CREATE OR UPDATE TST");
      if (subject === "TTP") print("TTP                 ISSUE TICKET FROM TST");
      return { events, state };
    }
    if (subject === "TN" || subject === "SN") {
      print(`HE ${subject}`);
      print(`${subject}ddMMMXXXYYY       TIMETABLE/SCHEDULE`);
      print(`EX: ${subject}26DECALGPAR`);
      return { events, state };
    }
    if (subject === "MD" || subject === "MU" || subject === "MT" || subject === "MB") {
      print(`HE ${subject}`);
      print("MD                  MOVE DOWN (NEXT PAGE)");
      print("MU                  MOVE UP (PREVIOUS PAGE)");
      print("MT                  MOVE TOP (FIRST PAGE)");
      print("MB                  MOVE BOTTOM (LAST PAGE)");
      return { events, state };
    }
    if (subject === "MN" || subject === "MY") {
      print(`HE ${subject}`);
      print("MN                  SAME AVAILABILITY, NEXT DAY");
      print("MY                  SAME AVAILABILITY, PREVIOUS DAY");
      return { events, state };
    }
    if (subject === "AC" || subject === "SC" || subject === "ACR") {
      print(`HE ${subject}`);
      print("ACddMMM             CHANGE DATE (ex: AC18MAY)");
      print("ACn / AC-n          SHIFT n DAYS (ex: AC3, AC-5)");
      print("ACXXXYYY            CHANGE CITY PAIR (ex: ACBCNFRA)");
      print("ACXXX               CHANGE ORIGIN ONLY (ex: ACBCN)");
      print("AC//YYY             CHANGE DESTINATION ONLY (ex: AC//FRA)");
      print("AC/AXX[,YY,ZZ]      AIRLINE FILTER (ex: AC/ALH,IB)");
      print("AC/Cx[y,z]          CLASS FILTER, /C ALONE CLEARS (ex: AC/CF)");
      print("AC/Bn               MINIMUM SEATS (ex: AC/B4)");
      print("AC hhmm             DEPARTURES AT/AFTER TIME (ex: AC1845)");
      print("SC                  SAME AS AC, REDISPLAYS AS SCHEDULE (SN)");
      print("ACR                 RETURN FLIGHTS, SWAPPED CITIES, AFTER 1800");
      print("ACRhhmm / ACRddMMMhhmm  RETURN WITH TIME (+ OPTIONAL DATE)");
      return { events, state };
    }
    if (subject === "RE") {
      print(`HE ${subject}`);
      print("RE                  RECALL AND RE-RUN THE LAST ENTRY");
      print("REn                 RECALL AND RE-RUN THE Nth-LAST ENTRY (ex: RE2)");
      return { events, state };
    }
    if (subject === "APE" || subject === "OP") {
      print(`HE ${subject}`);
      if (subject === "APE") print("APE-EMAIL@DOMAIN.TLD ADD EMAIL CONTACT");
      if (subject === "OP") print("OPddMMM/TEXT        ADD OPTION REMINDER");
      return { events, state };
    }
    if (subject === "TWD" || subject === "TWX") {
      print(`HE ${subject}`);
      if (subject === "TWD") print("TWD[ticket-number]  DISPLAY E-TICKET");
      if (subject === "TWX") print("TWX[ticket-number]  VOID E-TICKET");
      return { events, state };
    }
    print("HELP NOT FOUND");
    return { events, state };
  }

  if (c === "HELP") {
    print("AVAILABLE COMMANDS");
    print("ANddMMMXXXYYY       AVAILABILITY (ex: AN26DECALGPAR)");
    print("ANXXXYYY/ddMMM      AVAILABILITY (ex: ANALGPAR/26DEC)");
    print("TNddMMMXXXYYY       TIMETABLE (ex: TN26DECALGPAR)");
    print("SNddMMMXXXYYY       SCHEDULE (ex: SN26DECALGPAR)");
    print("MD/MU/MT/MB         SCROLL LAST DISPLAY (HE MD for syntax)");
    print("MN/MY               SAME AVAILABILITY NEXT/PREVIOUS DAY");
    print("AC/SC/ACR           CHANGE OR REVERSE LAST DISPLAY (HE AC for syntax)");
    print("SSnCn[pax]          SELL (ex: SS1Y1 / SS2M2 / SS1Y)");
    print("SSAABBBBCddMMMXXXYYYn  LONG SELL (ex: SSAF950C12DECCDGBRU1)");
    print("SB                  REBOOK CLASS/DATE/FLIGHT (HE SB for syntax)");
    print("n/TEXT              MODIFY RM/OSI/SSR/OP/TK (HE MODIFY for syntax)");
    print("XE1                 CANCEL SEGMENT");
    print("DLn                 DELETE SEGMENT (HE DL for syntax)");
    print("SI ARNK             CONTINUITY GAP (HE SI for syntax)");
    print("IG                  IGNORE PNR");
    print("IRXXXXXX            RETRIEVE PNR");
    print("XI                  CANCEL ACTIVE PNR");
    print("DAC XXX             DECODE IATA (ex: DAC ALG)");
    print("DAN <TEXT>          ENCODE SEARCH (ex: DAN PARIS)");
    print("NM                  NAME (MR/MRS optional, CHD/INF)");
    print("NUn/nNAME/FIRST     CORRECT NAME (HE NU for syntax)");
    print("AP                  CONTACT");
    print("APE                 EMAIL CONTACT");
    print("OP                  OPTION/REMINDER");
    print("RF                  SIGNATURE (RFMM)");
    print("TKTL/TKOK/TKXL      TICKETING TIME LIMIT / OK / CANCEL DATE");
    print("FXP/FXX/FXR/FXB     PRICING");
    print("ER                  END PNR");
    print("ET                  END TRANSACTION (LIKE ER, NO REDISPLAY)");
    print("RT                  DISPLAY PNR (same as live)");
    print("RE/REn              RECALL LAST/Nth-LAST ENTRY (HE RE for syntax)");
    print("TTP                 ISSUE TICKET");
    print("TWD                 DISPLAY LAST ISSUED TICKET");
    print("TWX                 VOID LAST ISSUED TICKET");
    return { events, state };
  }

  if (c.startsWith("DAC")) {
    const m = c.match(/^DAC\s*([A-Z]{3})$/);
    if (!m) {
      print("CHECK FORMAT");
      return { events, state };
    }
    if (!deps.locations) {
      print("LOCATION PROVIDER NOT CONFIGURED");
      return { events, state };
    }
    try {
      const lines = await deps.locations.decodeIata(m[1]);
      if (!Array.isArray(lines)) {
        print("CHECK FORMAT");
        return { events, state };
      }
      lines.forEach(print);
    } catch (e) {
      print("CHECK FORMAT");
    }
    return { events, state };
  }

  if (c.startsWith("DAN")) {
    const text = raw.slice(3).trim();
    if (!deps.locations) {
      print("LOCATION PROVIDER NOT CONFIGURED");
      return { events, state };
    }
    try {
      const lines = await deps.locations.searchByText(text);
      if (!Array.isArray(lines)) {
        print("CHECK FORMAT");
        return { events, state };
      }
      lines.forEach(print);
    } catch (e) {
      print("CHECK FORMAT");
    }
    return { events, state };
  }

  if (c.startsWith("TN")) {
    const result = await handleTN(state, c, deps);
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines.forEach(print);
    return { events, state };
  }

  if (c.startsWith("SN")) {
    const result = await handleSN(state, c, deps);
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines.forEach(print);
    return { events, state };
  }

  if (c === "MD" || c === "MU" || c === "MT" || c === "MB") {
    const direction = { MD: "down", MU: "up", MT: "top", MB: "bottom" }[c];
    const result = handleDisplayNav(state, direction);
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines.forEach(print);
    return { events, state };
  }

  if (c === "MN" || c === "MY") {
    const result = await handleMoveDay(state, deps, c === "MN" ? 1 : -1);
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines?.forEach(print);
    return { events, state };
  }

  // ACR must be checked before the generic "AC" prefix (ACR also starts
  // with "AC") -- deterministic parsing order per the architect's spec.
  if (c.startsWith("ACR")) {
    const result = await handleReturnAvailability(state, deps, c.slice(3));
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines?.forEach(print);
    return { events, state };
  }

  if (c.startsWith("AC")) {
    const result = await handleAvailabilityChange(state, deps, c.slice(2), "AN");
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines?.forEach(print);
    return { events, state };
  }

  if (c.startsWith("SC")) {
    const result = await handleAvailabilityChange(state, deps, c.slice(2), "SN");
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines?.forEach(print);
    return { events, state };
  }

  if (c === "IG") {
    const recordLocator = resolveRecordedLocator(state);
    if (recordLocator) {
      const discardedSegments = computeUnrecordedTailSegments(state);
      const restored = restoreRecordedState(state, recordLocator);
      if (restored) {
        releaseInventoryForSegments(state, discardedSegments);
        print("IGNORED");
        renderPNRLiveView(state, deps.clock).forEach(print);
        return { events, state };
      }
    }
    // No recorded snapshot to fall back to: if a PNR is still only "in
    // memory" (never went through ER), IG discards it outright instead of
    // requiring a Record Locator that was never created.
    if (state.activePNR) {
      releaseInventoryForSegments(state, state.activePNR.itinerary);
      state.activePNR = null;
      state.tsts = [];
      state.recordedSnapshot = null;
      print("IGNORED");
      renderPNRLiveView(state, deps.clock).forEach(print);
      return { events, state };
    }
    print("NO RECORDED PNR");
    return { events, state };
  }

  if (c.startsWith("IR")) {
    const matchWithLocator = raw.toUpperCase().match(/^IR\s*([A-Z]{6})$/);
    if (!matchWithLocator && c !== "IR") {
      print("CHECK FORMAT");
      return { events, state };
    }
    const recordLocator = resolveRecordedLocator(
      state,
      matchWithLocator ? matchWithLocator[1] : null
    );
    if (!recordLocator) {
      print("NO RECORDED PNR");
      return { events, state };
    }
    const discardedSegments = computeUnrecordedTailSegments(state);
    const restored = restoreRecordedState(state, recordLocator);
    if (!restored) {
      print(matchWithLocator ? "PNR NOT FOUND" : "NO RECORDED PNR");
      return { events, state };
    }
    releaseInventoryForSegments(state, discardedSegments);
    print("RETRIEVED");
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c === "XI") {
    if (!state.activePNR) {
      renderPNRLiveView(state, deps.clock).forEach(print);
      return { events, state };
    }
    // Keep recorded store entries intact; XI only clears the active working
    // PNR. Only the segments sold since the PNR's own last save are
    // released -- an already-recorded segment stays sold, since the record
    // itself is untouched and still retrievable via IR.
    releaseInventoryForSegments(state, computeUnrecordedTailSegments(state));
    state.activePNR = null;
    state.tsts = [];
    state.recordedSnapshot = null;
    print("OK");
    print("PNR CANCELLED");
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c.startsWith("QP")) {
    const match = c.match(/^QP\/?([A-Z0-9]{2,8})$/);
    if (!match) {
      print("CHECK FORMAT");
      return { events, state };
    }
    const queueId = normalizeQueueId(match[1]);
    const recordLocator = resolveRecordedLocator(state);
    if (!recordLocator) {
      print("NO RECORDED PNR");
      return { events, state };
    }
    state.queueStore = queueAdd(state.queueStore, queueId, recordLocator);
    print(`PLACED IN QUEUE ${queueId}`);
    return { events, state };
  }

  if (c.startsWith("QD")) {
    const match = c.match(/^QD\/?([A-Z0-9]{2,8})$/);
    if (!match) {
      print("CHECK FORMAT");
      return { events, state };
    }
    const queueId = normalizeQueueId(match[1]);
    const queue = state.queueStore ? state.queueStore[queueId] : null;
    if (!queue) {
      print("QUEUE NOT FOUND");
      return { events, state };
    }
    print(`QUEUE ${queueId}`);
    if (queue.length === 0) {
      print("QUEUE EMPTY");
      return { events, state };
    }
    const pageSize = 5;
    const totalPages = Math.ceil(queue.length / pageSize);
    if (totalPages > 1) {
      for (let page = 1; page <= totalPages; page++) {
        print(`PAGE ${page}/${totalPages}`);
        const start = (page - 1) * pageSize;
        const end = Math.min(start + pageSize, queue.length);
        for (let i = start; i < end; i++) {
          print(`${i + 1} ${queue[i]}`);
        }
      }
      return { events, state };
    }
    queue.forEach((recordLocator, index) => print(`${index + 1} ${recordLocator}`));
    return { events, state };
  }

  if (c.startsWith("QE")) {
    const match = c.match(/^QE\/?([A-Z0-9]{2,8})$/);
    if (!match) {
      print("CHECK FORMAT");
      return { events, state };
    }
    const queueId = normalizeQueueId(match[1]);
    const queue = state.queueStore ? state.queueStore[queueId] : null;
    if (!queue) {
      print("QUEUE NOT FOUND");
      return { events, state };
    }
    state.activeQueue = queueId;
    state.currentQueueItem = null;
    print(`QUEUE ${queueId} OPEN`);
    return { events, state };
  }

  if (c.startsWith("QN")) {
    if (c !== "QN") {
      print("CHECK FORMAT");
      return { events, state };
    }
    if (!state.activeQueue) {
      print("NO ACTIVE QUEUE");
      return { events, state };
    }
    const queue = state.queueStore ? state.queueStore[state.activeQueue] : null;
    if (!queue || queue.length === 0) {
      print("QUEUE EMPTY");
      return { events, state };
    }
    let nextRecordLocator = queuePeek(state.queueStore, state.activeQueue);
    if (state.currentQueueItem) {
      const currentIndex = queue.indexOf(state.currentQueueItem);
      if (currentIndex >= 0 && currentIndex + 1 < queue.length) {
        nextRecordLocator = queue[currentIndex + 1];
      } else if (currentIndex >= 0) {
        nextRecordLocator = queue[currentIndex];
      } else {
        nextRecordLocator = queue[0];
      }
    }

    const restored = restoreRecordedState(state, nextRecordLocator);
    if (!restored) {
      print("PNR NOT FOUND");
      return { events, state };
    }
    state.currentQueueItem = nextRecordLocator;
    print(`PNR FROM QUEUE ${state.activeQueue} ${nextRecordLocator}`);
    return { events, state };
  }

  if (c.startsWith("QR")) {
    if (c !== "QR") {
      print("CHECK FORMAT");
      return { events, state };
    }
    if (!state.activeQueue) {
      print("NO ACTIVE QUEUE");
      return { events, state };
    }
    if (!state.currentQueueItem) {
      print("NO CURRENT QUEUE ITEM");
      return { events, state };
    }
    const queue = state.queueStore ? state.queueStore[state.activeQueue] : null;
    if (!queue) {
      print("QUEUE NOT FOUND");
      return { events, state };
    }
    const current = state.currentQueueItem;
    state.queueStore = queueRemove(state.queueStore, state.activeQueue, current);
    state.currentQueueItem = null;
    print(`REMOVED FROM QUEUE ${state.activeQueue} ${current}`);
    return { events, state };
  }

  if (c.startsWith("QS")) {
    if (c !== "QS") {
      print("CHECK FORMAT");
      return { events, state };
    }
    state.activeQueue = null;
    state.currentQueueItem = null;
    print("QUEUE CLOSED");
    return { events, state };
  }

  if (c.startsWith("XI")) {
    // XI element-level cancellation is intentionally not supported here.
    // Use XE<n> / XE<n-m> for deterministic element cancellation.
    print("CHECK FORMAT");
    return { events, state };
  }

  if (c.startsWith("AN") && c.length > 2) {
    const result = await handleAN(state, c, deps, options);
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines?.forEach(print);
    return { events, state };
  }

  if (c.startsWith("SS") && !c.startsWith("SSR")) {
    // Digit right after SS -> sell a line from the last AN (existing).
    // Letter right after SS -> long sell by airline/flight (no prior AN).
    const isLongSell = /^SS[A-Z]/.test(c);
    const result = isLongSell
      ? await handleSSLongSell(state, c, deps)
      : handleSS(state, c, deps.clock);
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines?.forEach(print);
    return { events, state };
  }

  if (c.startsWith("SB")) {
    const result = await handleSB(state, c, deps);
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines?.forEach(print);
    return { events, state };
  }

  if (/^\d{1,2}\//.test(c)) {
    const result = handleElementModify(state, c, deps);
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines?.forEach(print);
    return { events, state };
  }

  if (c.startsWith("XE")) {
    const result = handleXE(state, c, deps.clock);
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines?.forEach(print);
    return { events, state };
  }

  if (c.startsWith("DL")) {
    const result = handleDL(state, c, deps);
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines?.forEach(print);
    return { events, state };
  }

  if (c.startsWith("SI")) {
    const result = handleSIArnk(state, c, deps);
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines?.forEach(print);
    return { events, state };
  }

  if (c.startsWith("NU")) {
    const result = handleNU(state, c, deps);
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines?.forEach(print);
    return { events, state };
  }

  if (c.startsWith("NM")) {
    ensurePNR(state);
    const pnr = state.activePNR;

    const chdMatch = c.match(
      /^NM\d+([A-Z'-]+)\/([A-Z'-]+)\s*\((CHD)(?:\/(\d{1,2}))?\)$/
    );
    const infMatch = c.match(/^NM\d+([A-Z'-]+)\/([A-Z'-]+)\s*\((INF)\)$/);

    if (chdMatch) {
      pnr.passengers.push({
        lastName: chdMatch[1],
        firstName: chdMatch[2],
        type: "CHD",
        age: chdMatch[4] ? chdMatch[4] : null,
      });
      renderPNRLiveView(state, deps.clock).forEach(print);
      return { events, state };
    }

    if (infMatch) {
      pnr.passengers.push({
        lastName: infMatch[1],
        firstName: infMatch[2],
        type: "INF",
      });
      renderPNRLiveView(state, deps.clock).forEach(print);
      return { events, state };
    }

    const adults = parseNmAdultEntries(c);
    if (adults && adults.length > 0) {
      pnr.passengers.push(...adults);
      renderPNRLiveView(state, deps.clock).forEach(print);
      return { events, state };
    }

    print("CHECK FORMAT");
    return { events, state };
  }

  if (c.startsWith("AP") && !c.startsWith("APE")) {
    ensurePNR(state);
    const pnr = state.activePNR;
    const apValue = raw.slice(2).trim();
    if (!apValue) {
      print("CHECK FORMAT");
      return { events, state };
    }
    pnr.contacts.push(c);
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c.startsWith("SSR")) {
    ensurePNR(state);
    const pnr = state.activePNR;
    const ssrMatch = c.match(/^SSR\s+([A-Z0-9]{2,4})\s+([A-Z0-9]{2})\s+(.+)$/);
    if (!ssrMatch) {
      print("CHECK FORMAT");
      return { events, state };
    }
    const code = ssrMatch[1];
    const airline = ssrMatch[2];
    const text = ssrMatch[3].trim();
    if (!text) {
      print("CHECK FORMAT");
      return { events, state };
    }
    pnr.ssr.push(`${code} ${airline} ${text}`);
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c.startsWith("OSI")) {
    ensurePNR(state);
    const pnr = state.activePNR;
    const osiMatch = c.match(/^OSI\s+([A-Z0-9]{2})\s+(.+)$/);
    if (!osiMatch) {
      print("CHECK FORMAT");
      return { events, state };
    }
    const airline = osiMatch[1];
    const text = osiMatch[2].trim();
    if (!text) {
      print("CHECK FORMAT");
      return { events, state };
    }
    pnr.osi.push(`${airline} ${text}`);
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c.startsWith("RF")) {
    ensurePNR(state);
    const pnr = state.activePNR;
    if (c.startsWith("RF+")) {
      print("CHECK FORMAT");
      return { events, state };
    }
    const rfValue = c.substring(2).trim();
    if (!rfValue) {
      print("CHECK FORMAT");
      return { events, state };
    }
    pnr.rf = rfValue;
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c === "ER" || c === "ET") {
    const result = recordPnr(state, deps);
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    if (result.cancelled) {
      print("OK");
      print("PNR CANCELLED");
      renderPNRLiveView(state, deps.clock).forEach(print);
      return { events, state };
    }
    print("PNR RECORDED");
    print("RECORD LOCATOR " + result.recordLocator);
    // ET is End Transaction, a twin of ER that does NOT redisplay the PNR
    // (docs/COMMANDES-MANQUANTES.md "2 ecarts de fidelite" -- and unlike
    // the old behavior, ET never issues a ticket either: TTP alone does).
    if (c === "ER") {
      renderPNRLiveView(state, deps.clock).forEach(print);
    }
    return { events, state };
  }

  if (c.startsWith("RM")) {
    ensurePNR(state);
    const pnr = state.activePNR;
    const rmValue = raw.slice(2).trim();
    if (!rmValue) {
      print("CHECK FORMAT");
      return { events, state };
    }
    pnr.remarks.push(rmValue.toUpperCase());
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c.startsWith("OP")) {
    ensurePNR(state);
    const pnr = state.activePNR;
    let optionDate = null;
    let optionText = null;
    const withDate = c.match(/^OP(\d{1,2}[A-Z]{3})\/(.+)$/);
    if (withDate) {
      const parsed = parseDDMMM(withDate[1], deps.clock);
      if (!parsed) {
        print("CHECK DATE");
        return { events, state };
      }
      optionDate = formatDDMMM(parsed);
      optionText = withDate[2].trim();
    } else {
      const withoutDate = c.match(/^OP\/\s*(.+)$/);
      if (!withoutDate) {
        print("CHECK FORMAT");
        return { events, state };
      }
      optionText = withoutDate[1].trim();
    }

    if (!optionText) {
      print("CHECK FORMAT");
      return { events, state };
    }

    pnr.options.push({ date: optionDate, text: optionText.toUpperCase() });
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c.startsWith("TKTL")) {
    ensurePNR(state);
    const pnr = state.activePNR;
    const tktlMatch = c.match(/^TKTL\/?(\d{1,2}[A-Z]{3})$/);
    if (!tktlMatch) {
      print("CHECK FORMAT");
      return { events, state };
    }
    const parsed = parseDDMMM(tktlMatch[1], deps.clock);
    if (!parsed) {
      print("CHECK DATE");
      return { events, state };
    }
    pnr.tk = { kind: "TL", date: formatDDMMM(parsed) };
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  // TKOK / TKXL complete the TK family alongside TKTL
  // (docs/COMMANDES-MANQUANTES.md Priorite 1) -- "un seul element TK par
  // PNR": each one simply overwrites pnr.tk, same as the other single-value
  // elements (RF, FP).
  if (c === "TKOK") {
    ensurePNR(state);
    state.activePNR.tk = { kind: "OK", date: null };
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c.startsWith("TKXL")) {
    ensurePNR(state);
    const pnr = state.activePNR;
    const tkxlMatch = c.match(/^TKXL\/?(\d{1,2}[A-Z]{3})$/);
    if (!tkxlMatch) {
      print("CHECK FORMAT");
      return { events, state };
    }
    const parsed = parseDDMMM(tkxlMatch[1], deps.clock);
    if (!parsed) {
      print("CHECK DATE");
      return { events, state };
    }
    pnr.tk = { kind: "XL", date: formatDDMMM(parsed) };
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c.startsWith("FP")) {
    ensurePNR(state);
    const pnr = state.activePNR;
    const fpValue = raw.slice(2).trim().toUpperCase();
    if (!fpValue) {
      print("CHECK FORMAT");
      return { events, state };
    }
    const valid =
      fpValue === "CASH" || /^CCVI[0-9X]{12,19}\/\d{4}$/.test(fpValue);
    if (!valid) {
      print("CHECK FORMAT");
      return { events, state };
    }
    pnr.fp = fpValue;
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c.startsWith("APE")) {
    ensurePNR(state);
    const pnr = state.activePNR;
    const apeValue = raw.slice(3).replace(/^[\s-]+/, "").trim().toUpperCase();
    const validEmail = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/.test(apeValue);
    if (!apeValue || !validEmail) {
      print("CHECK FORMAT");
      return { events, state };
    }
    pnr.emails.push(apeValue);
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c === "RT") {
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c === "FXP") {
    const pnr = state.activePNR;
    if (!pnr || !pnr.itinerary || pnr.itinerary.length === 0) {
      print("NO ITINERARY");
      return { events, state };
    }
    const activeSegments = getActiveSortedItinerary(pnr, deps.clock);
    if (activeSegments.length === 0) {
      print("NO ITINERARY");
      return { events, state };
    }
    if (!pnr.passengers || pnr.passengers.length === 0) {
      print("NO NAME");
      return { events, state };
    }
    const pricing = deps.pricing.price({
      pnr,
      mode: "FXP",
      segmentsOverride: activeSegments,
      clock: deps.clock,
    });
    const currentTst = state.tsts && state.tsts.length > 0 ? state.tsts[0] : null;
    const id = currentTst ? currentTst.id : ++state.lastTstId;
    const tst = createNormalizedTst({ id, pricing, status: "CREATED" });
    state.tsts = [tst];

    print("FXP");
    print("PRICING - FXP (BOOKED RBD)");
    print(
      `TST ${currentTst ? "UPDATED" : "CREATED"}  ${id}  PAX ${formatPaxSummary(
        pricing.paxCounts
      )}   STATUS: CREATED`
    );
    print(`VALIDATING CARRIER: ${pricing.validatingCarrier}`);
    print(`SEGMENTS: ${formatSegmentsRange(tst.segments)}`);
    print("");
    print("FARE BASIS:");
    pricing.fareBasis.forEach((fb, idx) => {
      print(`  ${idx + 1}  ${fb}`);
    });
    print("");
    print(`FARE     EUR ${formatMoney(pricing.baseFare)}`);
    print(`TAX      EUR ${formatMoney(pricing.taxTotal)}`);
    print(`  DZ     ${formatMoney(pricing.taxes.DZ)}`);
    print(`  FR     ${formatMoney(pricing.taxes.FR)}`);
    print(`  YQ     ${formatMoney(pricing.taxes.YQ)}`);
    print(`  XT     ${formatMoney(pricing.taxes.XT)}`);
    print(`TOTAL    EUR ${formatMoney(pricing.total)}`);
    print("");
    print("NOTE: TST VALIDATION REQUIRES RF + ER");
    return { events, state };
  }

  if (c === "FXX") {
    const pnr = state.activePNR;
    if (!pnr || !pnr.itinerary || pnr.itinerary.length === 0) {
      print("NO ITINERARY");
      return { events, state };
    }
    if (!state.tsts || state.tsts.length === 0) {
      print("NO TST");
      return { events, state };
    }
    const tst = state.tsts[state.tsts.length - 1];
    tst.status = "STORED";
    tst.pricingStatus = "STORED";

    print("FXX");
    print("QUOTE - FXX (BOOKED RBD) - TST STORED");
    print(`TST STORED  ${tst.id}  STATUS: STORED`);
    print(`VALIDATING CARRIER: ${tst.validatingCarrier}`);
    print(`SEGMENTS: ${formatSegmentsRange(tst.segments)}`);
    print("");
    print(`FARE     ${tst.currency} ${formatMoney(tst.baseFare)}`);
    print(`TAX      ${tst.currency} ${formatMoney(tst.taxTotal)}`);
    print(`TOTAL    ${tst.currency} ${formatMoney(tst.total)}`);
    return { events, state };
  }

  if (c === "FXR") {
    const pnr = state.activePNR;
    if (!pnr || !pnr.itinerary || pnr.itinerary.length === 0) {
      print("NO ITINERARY");
      return { events, state };
    }
    const activeSegments = getActiveSortedItinerary(pnr, deps.clock);
    if (activeSegments.length === 0) {
      print("NO ITINERARY");
      return { events, state };
    }
    // Unlike FXP/FXB, FXR (reprice low fare, no rebook/no TST persistence
    // beyond the reprice display) does not require a name in the PNR
    // (confirmed by Massy - real GDS experience, Mission 03).
    const pricing = deps.pricing.price({
      pnr,
      mode: "FXR",
      segmentsOverride: activeSegments,
      clock: deps.clock,
    });
    const currentTst = state.tsts && state.tsts.length > 0 ? state.tsts[0] : null;
    const id = currentTst ? currentTst.id : ++state.lastTstId;
    const tst = createNormalizedTst({ id, pricing, status: "REPRICED" });
    state.tsts = [tst];

    print("FXR");
    print("REPRICE - FXR");
    print(`TST ${currentTst ? "UPDATED" : "CREATED"}  ${id}  STATUS: REPRICED`);
    print(`VALIDATING CARRIER: ${pricing.validatingCarrier}`);
    print(`SEGMENTS: ${formatSegmentsRange(tst.segments)}`);
    print("");
    print(`NEW FARE  EUR ${formatMoney(pricing.baseFare)}`);
    print(`NEW TAX   EUR ${formatMoney(pricing.taxTotal)}`);
    print(`NEW TOTAL EUR ${formatMoney(pricing.total)}`);
    return { events, state };
  }

  if (c === "FXB") {
    const pnr = state.activePNR;
    if (!pnr || !pnr.itinerary || pnr.itinerary.length === 0) {
      print("NO ITINERARY");
      return { events, state };
    }
    const activeSegments = getActiveSortedItinerary(pnr, deps.clock);
    if (activeSegments.length === 0) {
      print("NO ITINERARY");
      return { events, state };
    }
    if (!pnr.passengers || pnr.passengers.length === 0) {
      print("NO NAME");
      return { events, state };
    }
    const pricing = deps.pricing.price({
      pnr,
      mode: "FXB",
      segmentsOverride: activeSegments,
      clock: deps.clock,
    });
    const currentTst = state.tsts && state.tsts.length > 0 ? state.tsts[0] : null;
    const id = currentTst ? currentTst.id : ++state.lastTstId;
    const tst = createNormalizedTst({
      id,
      pricing,
      status: "READY_TO_TICKET",
    });
    state.tsts = [tst];

    print("FXB");
    print("BEST BUY - FINAL PRICING");
    print(`VALIDATING CARRIER: ${pricing.validatingCarrier}`);
    print(`SEGMENTS: ${formatSegmentsRange(tst.segments)}`);
    print("");
    print(
      `TST ${currentTst ? "UPDATED" : "CREATED"}  ${id}  PAX ${formatPaxSummary(
        pricing.paxCounts
      )}   STATUS: READY_TO_TICKET`
    );
    print("");
    print(`FARE     EUR ${formatMoney(pricing.baseFare)}`);
    print(`TAX      EUR ${formatMoney(pricing.taxTotal)}`);
    print(`  DZ     ${formatMoney(pricing.taxes.DZ)}`);
    print(`  FR     ${formatMoney(pricing.taxes.FR)}`);
    print(`  YQ     ${formatMoney(pricing.taxes.YQ)}`);
    print(`  XT     ${formatMoney(pricing.taxes.XT)}`);
    print(`TOTAL    EUR ${formatMoney(pricing.total)}`);
    print("");
    print("NOTE: TST VALIDATION REQUIRES RF + ER");
    return { events, state };
  }

  if (c.startsWith("FXL")) {
    if (c.includes("/")) {
      print("FXL");
      print("FUNCTION NOT APPLICABLE");
      return { events, state };
    }
    if (!state.tsts || state.tsts.length === 0) {
      print("NO TST");
      return { events, state };
    }
    const tst = state.tsts[state.tsts.length - 1];
    print("FXL");
    print("PRICING DISPLAY - STORED TST");
    print(
      `TST ${tst.id}  STATUS ${tst.status}  VC ${tst.validatingCarrier}  CUR ${tst.currency}`
    );
    print(`SEGMENTS: ${formatSegmentsRange(tst.segments)}`);
    print("");
    print("FARE BASIS:");
    tst.fareBasis.forEach((fareBasis, index) => {
      print(`  ${index + 1}  ${fareBasis}`);
    });
    print("");
    print(`FARE     ${tst.currency} ${formatMoney(tst.baseFare)}`);
    print(`TAX      ${tst.currency} ${formatMoney(tst.taxTotal)}`);
    print(`TOTAL    ${tst.currency} ${formatMoney(tst.total)}`);
    return { events, state };
  }

  if (c.startsWith("TQT")) {
    if (!state.tsts || state.tsts.length === 0) {
      print("NO TST");
      return { events, state };
    }
    const m = c.match(/^TQT(\d+)?$/);
    if (!m) {
      print("CHECK FORMAT");
      return { events, state };
    }
    const id = m[1] ? parseInt(m[1], 10) : state.tsts[state.tsts.length - 1].id;
    const tst = state.tsts.find((t) => t.id === id);
    if (!tst) {
      print("NO TST");
      return { events, state };
    }
    buildTstDetailLines(tst).forEach(print);
    return { events, state };
  }

  if (c.startsWith("FQN")) {
    if (!state.tsts || state.tsts.length === 0) {
      print("NO TST");
      return { events, state };
    }
    const m = c.match(/^FQN(\d+)?$/);
    if (!m) {
      print("CHECK FORMAT");
      return { events, state };
    }
    const index = m[1] ? parseInt(m[1], 10) : 1;
    const tst = state.tsts[state.tsts.length - 1];
    const fareBasis = tst.fareBasis[index - 1] || tst.fareBasis[0];
    print(`FQN${index}`);
    buildFqnLines(fareBasis, `${fareBasis}${index}`).forEach(print);
    return { events, state };
  }

  if (c === "TTP") {
    const pnr = state.activePNR;
    if (!pnr || !pnr.itinerary || pnr.itinerary.length === 0) {
      print("NO ITINERARY");
      return { events, state };
    }
    if (!state.tsts || state.tsts.length === 0) {
      print("NO TST");
      return { events, state };
    }
    if (!pnr.fp) {
      print("NO FORM OF PAYMENT");
      return { events, state };
    }
    const tst = state.tsts[state.tsts.length - 1];
    const existingIssuedTicket = (pnr.tickets || []).find(
      (item) => item.tstId === tst.id && item.status !== "VOID"
    );
    if (existingIssuedTicket) {
      print("TICKET ALREADY ISSUED");
      return { events, state };
    }
    const ticketSeq = ++state.lastTicketSeq;
    const ticket = {
      id: ticketSeq,
      ticketNumber: formatTicketNumber(ticketSeq),
      status: "ISSUED",
      tstId: tst.id,
      issuedAt: new Date(deps.clock.now()).toISOString(),
    };
    ensurePNR(state);
    pnr.tickets.push(ticket);
    tst.status = "TICKETED";
    tst.pricingStatus = "TICKETED";
    print(c);
    print(`TICKET ISSUED ${ticket.ticketNumber}`);
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c.startsWith("TWD")) {
    const pnr = state.activePNR;
    if (!pnr || !Array.isArray(pnr.tickets) || pnr.tickets.length === 0) {
      print("NO TICKET");
      return { events, state };
    }
    const match = c.match(/^TWD(?:\s+([0-9]{3}-[0-9]{10}))?$/);
    if (!match) {
      print("CHECK FORMAT");
      return { events, state };
    }
    const ticket = resolveTicketForDisplayOrVoid(pnr, match[1] || null);
    if (!ticket) {
      print("NO TICKET");
      return { events, state };
    }
    // Minimal ticket-image placeholder (fare basis/taxes/endorsements not
    // modeled yet) -- exact real TWD screen layout marked "a verifier" in
    // docs/ERREURS-AMADEUS.md pending Massy's confirmation.
    print("TWD");
    print(`FA ${ticket.ticketNumber} ${ticket.status || "ISSUED"}`);
    print(`FB TST${ticket.tstId || "-"} ${ticket.ticketNumber}`);
    return { events, state };
  }

  if (c.startsWith("TWX")) {
    const pnr = state.activePNR;
    if (!pnr || !Array.isArray(pnr.tickets) || pnr.tickets.length === 0) {
      print("NO TICKET");
      return { events, state };
    }
    const match = c.match(/^TWX(?:\s+([0-9]{3}-[0-9]{10}))?$/);
    if (!match) {
      print("CHECK FORMAT");
      return { events, state };
    }
    const ticket = resolveTicketForDisplayOrVoid(pnr, match[1] || null);
    if (!ticket) {
      print("NO TICKET");
      return { events, state };
    }
    if (ticket.status === "VOID") {
      print("NOTHING TO CANCEL");
      return { events, state };
    }
    ticket.status = "VOID";
    ticket.voidedAt = new Date(deps.clock.now()).toISOString();
    if (ticket.tstId && Array.isArray(state.tsts)) {
      const hasIssuedTicketOnSameTst = (pnr.tickets || []).some(
        (item) => item.tstId === ticket.tstId && item.status !== "VOID"
      );
      if (!hasIssuedTicketOnSameTst) {
        const linkedTst = state.tsts.find((item) => item.id === ticket.tstId);
        if (linkedTst) {
          linkedTst.status = "VOID";
          linkedTst.pricingStatus = "VOID";
        }
      }
    }
    print("TWX");
    print(`TICKET VOIDED ${ticket.ticketNumber}`);
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c.startsWith("ITR")) {
    if (c !== "ITR-EML") {
      print("CHECK FORMAT");
      return { events, state };
    }
    const pnr = state.activePNR;
    if (!pnr || !Array.isArray(pnr.tickets) || pnr.tickets.length === 0) {
      print("NO TICKET");
      return { events, state };
    }
    if (!Array.isArray(pnr.emails) || pnr.emails.length === 0) {
      print("NO EMAIL ADDRESS");
      return { events, state };
    }

    const activeTicket =
      [...pnr.tickets].reverse().find((item) => item.status !== "VOID") ||
      pnr.tickets[pnr.tickets.length - 1];
    const paxName =
      (pnr.passengers && pnr.passengers[0] && paxDisplay(pnr.passengers[0])) ||
      "UNKNOWN PAX";
    const segments = getActiveSortedItinerary(pnr, deps.clock).map(
      (seg) => `${seg.from}-${seg.to} ${seg.dateDDMMM}`
    );
    const sentAtIso = new Date(deps.clock.now()).toISOString();
    pnr.receipts ||= [];
    pnr.receipts.push({
      type: "ITR-EML",
      email: pnr.emails[0],
      ticketNumber: activeTicket.ticketNumber,
      passengerName: paxName,
      segments,
      sentAt: sentAtIso,
      message: `ITR-EML ${paxName} ${activeTicket.ticketNumber} ${segments.join(" | ")} ${sentAtIso}`,
    });

    print("ITINERARY RECEIPT SENT");
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  print("CHECK FORMAT");
  return { events, state };
}



