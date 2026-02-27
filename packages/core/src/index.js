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

  const classes = [
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

function ensurePNR(state) {
  if (!state.activePNR) {
    state.activePNR = {
      passengers: [],
      contacts: [],
      rf: null,
      recordLocator: null,
      status: "ACTIVE",
      itinerary: [],
      ssr: [],
      osi: [],
      remarks: [],
      tktl: null,
      fp: null,
      elements: [],
    };
  } else {
    state.activePNR.passengers ||= [];
    state.activePNR.contacts ||= [];
    state.activePNR.itinerary ||= [];
    state.activePNR.ssr ||= [];
    state.activePNR.osi ||= [];
    state.activePNR.remarks ||= [];
    state.activePNR.tktl ||= null;
    state.activePNR.fp ||= null;
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
    const nameMatch = token.match(/^([A-Z]+)\/([A-Z]+)$/);
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
  pnr.ssr ||= [];
  pnr.osi ||= [];
  pnr.remarks ||= [];

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

  if (pnr.tktl) elements.push({ kind: "TKTL" });
  if (pnr.fp) elements.push({ kind: "FP" });

  pnr.contacts.forEach((_, index) => {
    elements.push({ kind: "AP", index });
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
      lines.push(`${padL(n, 2)} ${segmentLineForPNR(segment)}`);
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
    if (element.kind === "TKTL" && pnr.tktl) {
      lines.push(`${padL(n, 2)} TKTL/${pnr.tktl}`);
      n++;
      continue;
    }
    if (element.kind === "FP" && pnr.fp) {
      lines.push(`${padL(n, 2)} FP ${pnr.fp}`);
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
      entry.kind === "SSR" ||
      entry.kind === "OSI" ||
      entry.kind === "RM"
    ) {
      elements.push({ elementNo, kind: entry.kind, index: entry.index });
      elementNo += 1;
      continue;
    }
    if (
      entry.kind === "TKTL" ||
      entry.kind === "FP" ||
      entry.kind === "RF" ||
      entry.kind === "RECLOC"
    ) {
      elements.push({ elementNo, kind: entry.kind });
      elementNo += 1;
    }
  }

  if (state.tsts && state.tsts.length > 0) {
    state.tsts.forEach((_, index) => {
      elements.push({ elementNo, kind: "TST", index });
      elementNo += 1;
    });
  }

  return elements;
}

function cancelElements(state, elements) {
  const pnr = state.activePNR;
  if (!pnr) return;
  pnr.contacts ||= [];
  pnr.ssr ||= [];
  pnr.osi ||= [];
  pnr.remarks ||= [];

  const apIndexes = [];
  const ssrIndexes = [];
  const osiIndexes = [];
  const rmIndexes = [];
  let cancelRf = false;
  let cancelTktl = false;
  let cancelFp = false;

  for (const element of elements) {
    if (element.kind === "SEG" && element.ref) {
      element.ref.status = "XX";
    } else if (element.kind === "AP") {
      apIndexes.push(element.index);
    } else if (element.kind === "SSR") {
      ssrIndexes.push(element.index);
    } else if (element.kind === "OSI") {
      osiIndexes.push(element.index);
    } else if (element.kind === "RM") {
      rmIndexes.push(element.index);
    } else if (element.kind === "TKTL") {
      cancelTktl = true;
    } else if (element.kind === "FP") {
      cancelFp = true;
    } else if (element.kind === "RF") {
      cancelRf = true;
    }
  }

  apIndexes.sort((a, b) => b - a).forEach((idx) => {
    if (idx >= 0 && idx < pnr.contacts.length) pnr.contacts.splice(idx, 1);
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
  if (cancelTktl) pnr.tktl = null;
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

  if (!dateObj || !from || !to) {
    return { error: "INVALID FORMAT" };
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
      return { error: "INVALID FORMAT" };
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
      return { error: "INVALID FORMAT" };
    }
    results = external;
  } else {
    results = buildOfflineAvailability({ from, to, ddmmm, dow });
  }

  state.lastAN = { query: { from, to, ddmmm, dow }, results };

  const lines = [];
  lines.push(`AN${ddmmm}${from}${to}`);
  lines.push(`** AMADEUS AVAILABILITY - AN ** ${to}`);

  results.forEach((r) => {
    const ln = String(r.lineNo);
    const airline = padR(r.airline, 2);
    const fno = padL(String(r.flightNo), 4, "0");

    const tokens = r.bookingClasses.map((x) => `${x.code}${x.seats}`);
    const wrapped = wrapTokens(tokens, 8);
    const route = `/${r.from} ${r.to}`;

    const line1 =
      `${ln}  ${airline} ${fno}  ` +
      padR(wrapped[0].join(" "), 34) +
      ` ${route}`;
    lines.push(line1);

    if (wrapped[1]) lines.push(`     ${wrapped[1].join(" ")}`);
    if (wrapped[2]) lines.push(`     ${wrapped[2].join(" ")}`);
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
    return { error: "INVALID FORMAT" };
  }

  const lineNo = parseInt(m[1], 10);
  const classCode = m[2];
  const paxCount = m[3] ? parseInt(m[3], 10) : 1;

  const item = state.lastAN.results.find((x) => x.lineNo === lineNo);
  if (!item) return { error: "INVALID FORMAT" };

  const cls = item.bookingClasses.find((x) => x.code === classCode);
  if (!cls) return { error: "INVALID FORMAT" };
  if (cls.seats <= 0) return { error: "NO SEATS" };
  if (paxCount > cls.seats) return { error: "NOT ENOUGH SEATS" };

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

function handleXE(state, cmdUpper, clock) {
  if (!state.activePNR) {
    return { error: "NO ACTIVE PNR" };
  }
  const elements = buildElementIndex(state, clock);
  const cancellableKinds = new Set([
    "SEG",
    "AP",
    "SSR",
    "OSI",
    "RM",
    "TKTL",
    "FP",
    "RF",
    "PAX",
  ]);
  const cancellableAllKinds = new Set([
    "SEG",
    "AP",
    "SSR",
    "OSI",
    "RM",
    "TKTL",
    "FP",
    "RF",
  ]);
  const totalCancellable = elements.filter((el) =>
    cancellableAllKinds.has(el.kind)
  ).length;

  if (cmdUpper === "XEALL") {
    if (totalCancellable === 0) return { error: "NOTHING TO CANCEL" };
    const toCancel = elements.filter((el) => cancellableAllKinds.has(el.kind));
    cancelElements(state, toCancel);
    return {
      lines: ["OK", "ITINERARY CANCELLED", ...renderPNRLiveView(state, clock)],
    };
  }

  let m = cmdUpper.match(/^XE(\d{1,3})$/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n < 1 || n > elements.length) return { error: "ELEMENT NOT FOUND" };
    const element = elements[n - 1];
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
    const paxElements = selected
      .filter((el) => el.kind === "PAX")
      .sort((left, right) => right.ref.paxIndex - left.ref.paxIndex);
    for (const paxElement of paxElements) {
      const paxResult = cancelPaxElement(state, paxElement);
      if (paxResult && paxResult.error) return { error: paxResult.error };
    }
    const otherElements = selected.filter((el) => el.kind !== "PAX");
    cancelElements(state, otherElements);
    return {
      lines: ["OK", "ELEMENTS CANCELLED", ...renderPNRLiveView(state, clock)],
    };
  }

  return { error: "INVALID FORMAT" };
}

export function createInitialState() {
  return {
    activePNR: null,
    lastAN: null,
    tsts: [],
    lastTstId: 0,
    pnrStore: {},
  };
}

function buildDefaultDeps() {
  const fallbackRng = createSeededRandom("DEFAULT_DEPS_RNG");
  const rng = () => fallbackRng();
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
    availability: createSimAvailabilityProvider({ buildOfflineAvailability }),
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
  const resolvedLocations =
    rawLocationsProvider &&
    typeof rawLocationsProvider.decodeIata === "function" &&
    typeof rawLocationsProvider.searchByText === "function"
      ? rawLocationsProvider
      : rawLocationsProvider &&
          typeof rawLocationsProvider.cmdDAC === "function" &&
          typeof rawLocationsProvider.cmdDAN === "function"
        ? {
            decodeIata: (code) => rawLocationsProvider.cmdDAC(code),
            searchByText: (text) => rawLocationsProvider.cmdDAN(text),
          }
        : null;
  return {
    availability: provided.availability || defaults.availability,
    pricing: provided.pricing || defaults.pricing,
    clock: resolvedClock,
    rng: resolvedRng,
    locations: resolvedLocations,
  };
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
    "INVALID FORMAT",
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
    "NOT ALLOWED - LAST ADT",
    "NOT ALLOWED - INF ASSOCIATED",
    "NOTHING TO CANCEL",
    "FUNCTION NOT APPLICABLE",
    "NO TST",
    "LOCATION PROVIDER NOT CONFIGURED",
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

  if (c === "HELP" || c === "HE") {
    print("AVAILABLE COMMANDS");
    print("ANddMMMXXXYYY       AVAILABILITY (ex: AN26DECALGPAR)");
    print("ANXXXYYY/ddMMM      AVAILABILITY (ex: ANALGPAR/26DEC)");
    print("SSnCn[pax]          SELL (ex: SS1Y1 / SS2M2 / SS1Y)");
    print("XE1                 CANCEL SEGMENT");
    print("IG                  IGNORE PNR");
    print("IRXXXXXX            RETRIEVE PNR");
    print("XI                  CANCEL PNR (SIGN/ER REQUIRED)");
    print("DAC XXX             DECODE IATA (ex: DAC ALG)");
    print("DAN <TEXT>          ENCODE SEARCH (ex: DAN PARIS)");
    print("NM                  NAME (MR/MRS optional, CHD/INF)");
    print("AP                  CONTACT");
    print("RF                  SIGNATURE (RFMM)");
    print("ER                  END PNR");
    print("RT                  DISPLAY PNR (same as live)");
    return { events, state };
  }

  if (c.startsWith("DAC")) {
    const m = c.match(/^DAC\s*([A-Z]{3})$/);
    if (!m) {
      print("INVALID FORMAT");
      return { events, state };
    }
    if (!deps.locations) {
      print("LOCATION PROVIDER NOT CONFIGURED");
      return { events, state };
    }
    try {
      const lines = await deps.locations.decodeIata(m[1]);
      if (!Array.isArray(lines)) {
        print("INVALID FORMAT");
        return { events, state };
      }
      lines.forEach(print);
    } catch (e) {
      print("INVALID FORMAT");
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
        print("INVALID FORMAT");
        return { events, state };
      }
      lines.forEach(print);
    } catch (e) {
      print("INVALID FORMAT");
    }
    return { events, state };
  }

  if (c === "IG") {
    if (!state.activePNR) {
      renderPNRLiveView(state, deps.clock).forEach(print);
      return { events, state };
    }
    state.activePNR = null;
    state.tsts = [];
    print("IGNORED");
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c.startsWith("IR")) {
    const match = raw.toUpperCase().match(/^IR\s*([A-Z]{6})$/);
    if (!match) {
      print("INVALID FORMAT");
      return { events, state };
    }
    const recordLocator = match[1];
    state.pnrStore ||= {};
    const stored = state.pnrStore[recordLocator];
    if (!stored) {
      print("PNR NOT FOUND");
      return { events, state };
    }
    state.activePNR = deepCopy(stored.pnrSnapshot);
    state.tsts = deepCopy(stored.tstsSnapshot) || [];
    print("RETRIEVED");
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c === "XI") {
    if (!state.activePNR) {
      renderPNRLiveView(state, deps.clock).forEach(print);
      return { events, state };
    }
    const pnr = state.activePNR;
    pnr.cancelRequested = true;
    pnr.passengers = [];
    pnr.itinerary = [];
    pnr.contacts = [];
    pnr.ssr = [];
    pnr.osi = [];
    pnr.remarks = [];
    pnr.tktl = null;
    pnr.fp = null;
    pnr.rf = null;
    state.tsts = [];
    print("PNR CANCELLED - SIGN/ER REQUIRED");
    renderPNRLiveView(state, deps.clock).forEach(print);
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
    const result = handleSS(state, c, deps.clock);
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

  if (c.startsWith("NM")) {
    ensurePNR(state);
    const pnr = state.activePNR;

    const chdMatch = c.match(
      /^NM\d+([A-Z]+)\/([A-Z]+)\s*\((CHD)(?:\/(\d{1,2}))?\)$/
    );
    const infMatch = c.match(/^NM\d+([A-Z]+)\/([A-Z]+)\s*\((INF)\)$/);

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

    print("INVALID FORMAT");
    return { events, state };
  }

  if (c.startsWith("AP")) {
    ensurePNR(state);
    const pnr = state.activePNR;
    pnr.contacts.push(c);
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c.startsWith("SSR")) {
    ensurePNR(state);
    const pnr = state.activePNR;
    const ssrMatch = c.match(/^SSR\s+([A-Z0-9]{2,4})\s+([A-Z0-9]{2})\s+(.+)$/);
    if (!ssrMatch) {
      print("INVALID FORMAT");
      return { events, state };
    }
    const code = ssrMatch[1];
    const airline = ssrMatch[2];
    const text = ssrMatch[3].trim();
    if (!text) {
      print("INVALID FORMAT");
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
      print("INVALID FORMAT");
      return { events, state };
    }
    const airline = osiMatch[1];
    const text = osiMatch[2].trim();
    if (!text) {
      print("INVALID FORMAT");
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
      print("INVALID FORMAT");
      return { events, state };
    }
    const rfValue = c.substring(2).trim();
    if (!rfValue) {
      print("INVALID FORMAT");
      return { events, state };
    }
    pnr.rf = rfValue;
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c === "ER") {
    const pnr = state.activePNR;
    if (!pnr) {
      print("NO ACTIVE PNR");
      return { events, state };
    }
    if (pnr.cancelRequested) {
      if (pnr.recordLocator && state.pnrStore) {
        delete state.pnrStore[pnr.recordLocator];
      }
      state.activePNR = null;
      state.tsts = [];
      print("OK");
      print("PNR CANCELLED");
      renderPNRLiveView(state, deps.clock).forEach(print);
      return { events, state };
    }
    if (!pnr.passengers.length) {
      print("END PNR FIRST");
      return { events, state };
    }
    if (!pnr.contacts.length) {
      print("END PNR FIRST");
      return { events, state };
    }
    if (!pnr.rf) {
      print("END PNR FIRST");
      return { events, state };
    }

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
    print("PNR RECORDED");
    print("RECORD LOCATOR " + pnr.recordLocator);
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c.startsWith("RM")) {
    ensurePNR(state);
    const pnr = state.activePNR;
    const rmValue = raw.slice(2).trim();
    if (!rmValue) {
      print("INVALID FORMAT");
      return { events, state };
    }
    pnr.remarks.push(rmValue.toUpperCase());
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c.startsWith("TKTL")) {
    ensurePNR(state);
    const pnr = state.activePNR;
    const tktlMatch = c.match(/^TKTL\/?(\d{1,2}[A-Z]{3})$/);
    if (!tktlMatch) {
      print("INVALID FORMAT");
      return { events, state };
    }
    const parsed = parseDDMMM(tktlMatch[1], deps.clock);
    if (!parsed) {
      print("INVALID FORMAT");
      return { events, state };
    }
    pnr.tktl = formatDDMMM(parsed);
    renderPNRLiveView(state, deps.clock).forEach(print);
    return { events, state };
  }

  if (c.startsWith("FP")) {
    ensurePNR(state);
    const pnr = state.activePNR;
    const fpValue = raw.slice(2).trim().toUpperCase();
    if (!fpValue) {
      print("INVALID FORMAT");
      return { events, state };
    }
    const valid =
      fpValue === "CASH" || /^CCVI[0-9X]{12,19}\/\d{4}$/.test(fpValue);
    if (!valid) {
      print("INVALID FORMAT");
      return { events, state };
    }
    pnr.fp = fpValue;
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
    const pricing = deps.pricing.price({
      pnr,
      mode: "FXP",
      clock: deps.clock,
    });
    const id = ++state.lastTstId;
    const tst = {
      id,
      paxCounts: pricing.paxCounts,
      segments: pricing.segments.map((s) => s.displayIndex),
      segmentDetails: pricing.segments.map((s) => ({ ...s })),
      validatingCarrier: pricing.validatingCarrier,
      fareBasis: pricing.fareBasis,
      baseFare: pricing.baseFare,
      taxes: pricing.taxes,
      taxTotal: pricing.taxTotal,
      total: pricing.total,
      status: "CREATED",
    };
    state.tsts = [tst];

    print("FXP");
    print("PRICING - FXP (BOOKED RBD)");
    print(
      `TST CREATED  ${id}  PAX ${formatPaxSummary(
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
    const pricing = deps.pricing.price({
      pnr,
      mode: "FXX",
      clock: deps.clock,
    });
    print("FXX");
    print("QUOTE - FXX (BOOKED RBD) - NO TST CREATED");
    print(`VALIDATING CARRIER: ${pricing.validatingCarrier}`);
    print(
      `SEGMENTS: ${formatSegmentsRange(
        pricing.segments.map((s) => s.displayIndex)
      )}`
    );
    print("");
    print(`FARE     EUR ${formatMoney(pricing.baseFare)}`);
    print(`TAX      EUR ${formatMoney(pricing.taxTotal)}`);
    print(`TOTAL    EUR ${formatMoney(pricing.total)}`);
    return { events, state };
  }

  if (c === "FXR") {
    const pnr = state.activePNR;
    if (!pnr || !pnr.itinerary || pnr.itinerary.length === 0) {
      print("NO ITINERARY");
      return { events, state };
    }
    const before = getSortedItinerary(pnr, deps.clock).map((s) => ({
      displayIndex: s.displayIndex,
      classCode: s.classCode || "Y",
    }));
    rebookSegments(pnr, "FXR");
    const pricing = deps.pricing.price({
      pnr,
      mode: "FXR",
      clock: deps.clock,
    });
    print("FXR");
    print("REBOOK TO LOWEST AVAILABLE - NO TST CREATED");
    print(`VALIDATING CARRIER: ${pricing.validatingCarrier}`);
    print("REBOOKED SEGMENTS:");
    pricing.segments.forEach((seg) => {
      const old = before.find((b) => b.displayIndex === seg.displayIndex);
      const oldCode = old ? old.classCode : seg.classCode;
      print(`  ${seg.displayIndex}  ${oldCode} -> ${seg.classCode}`);
    });
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
    const before = getSortedItinerary(pnr, deps.clock).map((s) => ({
      displayIndex: s.displayIndex,
      classCode: s.classCode || "Y",
    }));
    rebookSegments(pnr, "FXB");
    const pricing = deps.pricing.price({
      pnr,
      mode: "FXB",
      clock: deps.clock,
    });
    const id = ++state.lastTstId;
    const tst = {
      id,
      paxCounts: pricing.paxCounts,
      segments: pricing.segments.map((s) => s.displayIndex),
      segmentDetails: pricing.segments.map((s) => ({ ...s })),
      validatingCarrier: pricing.validatingCarrier,
      fareBasis: pricing.fareBasis,
      baseFare: pricing.baseFare,
      taxes: pricing.taxes,
      taxTotal: pricing.taxTotal,
      total: pricing.total,
      status: "CREATED",
    };
    state.tsts = [tst];

    print("FXB");
    print("BEST BUY - REBOOK + CREATE TST");
    print(`VALIDATING CARRIER: ${pricing.validatingCarrier}`);
    print("REBOOKED SEGMENTS:");
    pricing.segments.forEach((seg) => {
      const old = before.find((b) => b.displayIndex === seg.displayIndex);
      const oldCode = old ? old.classCode : seg.classCode;
      print(`  ${seg.displayIndex}  ${oldCode} -> ${seg.classCode}`);
    });
    print("");
    print(
      `TST CREATED  ${id}  PAX ${formatPaxSummary(
        pricing.paxCounts
      )}   STATUS: CREATED`
    );
    print(`SEGMENTS: ${formatSegmentsRange(tst.segments)}`);
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
    const pnr = state.activePNR;
    if (!pnr || !pnr.itinerary || pnr.itinerary.length === 0) {
      print("NO ITINERARY");
      return { events, state };
    }
    const baseSegments = getSortedItinerary(pnr, deps.clock);
    const options = [];
    for (let i = 0; i < 3; i++) {
      const optionSegments = baseSegments.map((seg) => {
        const idx = RBD_LADDER.indexOf(seg.classCode || "Y");
        const index = idx === -1 ? 3 : idx;
        const newIndex = Math.min(RBD_LADDER.length - 1, index + i + 1);
        return { ...seg, classCode: RBD_LADDER[newIndex] };
      });
      const pricing = deps.pricing.price({
        pnr,
        mode: `FXL${i + 1}`,
        segmentsOverride: optionSegments,
        clock: deps.clock,
      });
      options.push({
        total: pricing.total,
        rbd: optionSegments.map((s) => s.classCode).join("/"),
        fareBasis: pricing.fareBasis.join("/"),
      });
    }
    print("FXL");
    print("LOWEST FARES - DISPLAY ONLY (NO REBOOK / NO TST)");
    print("");
    options.forEach((opt, idx) => {
      print(
        `OPTION ${idx + 1}  TOTAL EUR ${formatMoney(opt.total)}  RBD ${
          opt.rbd
        }   FARE BASIS ${opt.fareBasis}`
      );
    });
    print("");
    print("USE FXB TO APPLY BEST BUY AND CREATE TST");
    return { events, state };
  }

  if (c.startsWith("TQT")) {
    if (!state.tsts || state.tsts.length === 0) {
      print("NO TST");
      return { events, state };
    }
    const m = c.match(/^TQT(\d+)?$/);
    if (!m) {
      print("INVALID FORMAT");
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
      print("INVALID FORMAT");
      return { events, state };
    }
    const index = m[1] ? parseInt(m[1], 10) : 1;
    const tst = state.tsts[state.tsts.length - 1];
    const fareBasis = tst.fareBasis[index - 1] || tst.fareBasis[0];
    print(`FQN${index}`);
    buildFqnLines(fareBasis, `${fareBasis}${index}`).forEach(print);
    return { events, state };
  }

  print("INVALID FORMAT");
  return { events, state };
}



