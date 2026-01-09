// ===============================
// SIMULATEUR AMADEUS - script.js
// Format cible A (Selling Platform classique) + UX Terminal premium
// - AN: wrap classes + espacement console (A)
// - SS: réponse réaliste (affiche la ligne vendue HKx comme Amadeus)
// - PNR Live View: sans sections, numérotation continue, noms 3/ligne
// - RT = identique au Live View
// - UX: historique (↑↓) + paste multi-lignes (queue) + anti double exec
// NOTE: validation IATA via findByIata désactivée temporairement (async)
// ===============================

import { cmdDAC, cmdDAN, DB } from "./data/db.js";

console.log("SCRIPT LOADED OK");

// -------------------------------
// DOM
// -------------------------------
const screen = document.getElementById("screen");
function scrollToBottom() {
  screen.scrollTop = screen.scrollHeight;
}

// -------------------------------
// ETAT GLOBAL
// -------------------------------
let activePNR = null;
let lastAN = null; // { query:{from,to,ddmmm,dow}, results:[...] }

// -------------------------------
// UX: history + queue
// -------------------------------
const history = [];
let historyPos = -1;

const commandQueue = [];
let isProcessingQueue = false;

// -------------------------------
// UTILS
// -------------------------------
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
function parseDDMMM(s) {
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
  const now = new Date();
  return new Date(now.getFullYear(), mm - 1, dd);
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
function ddmmmToDate(ddmmm) {
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
  const now = new Date();
  return new Date(now.getFullYear(), map[mon], dd);
}
function generateRecordLocator() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let rl = "";
  for (let i = 0; i < 6; i++)
    rl += chars[Math.floor(Math.random() * chars.length)];
  return rl;
}

function splitMultiLines(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function wrapTokens(tokens, maxPerLine) {
  const out = [];
  for (let i = 0; i < tokens.length; i += maxPerLine) {
    out.push(tokens.slice(i, i + maxPerLine));
  }
  return out;
}

// -------------------------------
// PRINT
// -------------------------------
function print(text) {
  const line = document.createElement("div");
  line.textContent = text;
  screen.appendChild(line);
  scrollToBottom();
}

// -------------------------------
// PROMPT
// -------------------------------
function createNewPrompt() {
  const existing = document.getElementById("commandInput");
  if (existing && existing.parentElement) existing.parentElement.remove();

  const line = document.createElement("div");
  line.className = "line";

  const prompt = document.createElement("span");
  prompt.className = "prompt";
  prompt.textContent = ">";

  const input = document.createElement("input");
  input.id = "commandInput";
  input.autocomplete = "off";

  // Paste multi-lignes => queue
  input.addEventListener("paste", (e) => {
    const txt = e.clipboardData?.getData("text") ?? "";
    const lines = splitMultiLines(txt);
    if (lines.length <= 1) return; // paste normal
    e.preventDefault();

    // on empile tout
    for (const l of lines) enqueueCommand(l);

    // on lance le traitement immédiatement
    void processQueue();
  });

  // Historique ↑↓
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;

      if (historyPos === -1) historyPos = history.length - 1;
      else historyPos = Math.max(0, historyPos - 1);

      input.value = history[historyPos] || "";
      // place cursor end
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (history.length === 0) return;

      if (historyPos === -1) return;
      historyPos = Math.min(history.length, historyPos + 1);

      if (historyPos >= history.length) {
        historyPos = -1;
        input.value = "";
      } else {
        input.value = history[historyPos] || "";
        input.setSelectionRange(input.value.length, input.value.length);
      }
      return;
    }
  });

  line.appendChild(prompt);
  line.appendChild(input);
  screen.appendChild(line);

  input.focus();
  scrollToBottom();
  return input;
}

// -------------------------------
// PNR STATE
// -------------------------------
function ensurePNR() {
  if (!activePNR) {
    activePNR = {
      passengers: [],
      contacts: [],
      rf: null,
      recordLocator: null,
      status: "ACTIVE",
      itinerary: [],
      ssr: [],
      osi: [],
    };
  } else {
    activePNR.passengers ||= [];
    activePNR.contacts ||= [];
    activePNR.itinerary ||= [];
    activePNR.ssr ||= [];
    activePNR.osi ||= [];
  }
}

// -------------------------------
// FORMAT A: PNR rendering
// -------------------------------
function paxDisplay(p) {
  // MR/MRS optionnel => si absent, on n'affiche rien
  if (p.type === "CHD") {
    if (p.age) return `${p.lastName}/${p.firstName} (CHD/${p.age})`;
    return `${p.lastName}/${p.firstName} (CHD)`;
  }
  if (p.type === "INF") return `${p.lastName}/${p.firstName} (INF)`;
  if (p.title) return `${p.lastName}/${p.firstName} ${p.title}`;
  return `${p.lastName}/${p.firstName}`;
}

function segmentLineForPNR(s) {
  // Ex A: "PC 0751 Y 12FEB ALGSAW 0700 0925 HK1"
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

// Live View (et RT) => identiques
function renderPNRLiveView() {
  if (!activePNR) {
    print("NO ACTIVE PNR");
    return;
  }

  let n = 1;

  // NOMS: 3 par ligne (numérotation continue)
  if (activePNR.passengers.length > 0) {
    let row = [];
    for (const p of activePNR.passengers) {
      row.push(`${n}. ${paxDisplay(p)}`);
      n++;
      if (row.length === 3) {
        print(row.join("  "));
        row = [];
      }
    }
    if (row.length) print(row.join("  "));
  }

  // ITIN: tri à l'affichage (sans toucher au stockage)
  if (activePNR.itinerary.length > 0) {
    const decorated = activePNR.itinerary.map((s, idx) => {
      const d = ddmmmToDate(s.dateDDMMM);
      const t = d ? d.getTime() : Number.POSITIVE_INFINITY;
      return { s, idx, t };
    });
    decorated.sort((a, b) => (a.t !== b.t ? a.t - b.t : a.idx - b.idx));

    for (const item of decorated) {
      print(`${padL(n, 2)} ${segmentLineForPNR(item.s)}`);
      n++;
    }
  }

  // AP: affiché directement (pas "CONTACT")
  for (const ap of activePNR.contacts) {
    print(`${padL(n, 2)} ${ap}`);
    n++;
  }

  // SSR/OSI (préparé)
  for (const x of activePNR.ssr) {
    print(`${padL(n, 2)} SSR ${x}`);
    n++;
  }
  for (const x of activePNR.osi) {
    print(`${padL(n, 2)} OSI ${x}`);
    n++;
  }

  if (activePNR.rf) {
    print(`${padL(n, 2)} RF ${activePNR.rf}`);
    n++;
  }

  if (activePNR.recordLocator) {
    print(`${padL(n, 2)} REC LOC ${activePNR.recordLocator}`);
    n++;
  }
}

function displayPNR() {
  renderPNRLiveView();
}

// -------------------------------
// FORMAT A: AN rendering
// -------------------------------
function handleAN(cmdUpper) {
  let dateObj = null;
  let from = null;
  let to = null;

  let m = cmdUpper.match(/^AN(\d{1,2}[A-Z]{3})([A-Z]{3})([A-Z]{3})$/);
  if (m) {
    dateObj = parseDDMMM(m[1]);
    from = m[2];
    to = m[3];
  } else {
    m = cmdUpper.match(/^AN([A-Z]{3})([A-Z]{3})\/(\d{1,2}[A-Z]{3})$/);
    if (m) {
      from = m[1];
      to = m[2];
      dateObj = parseDDMMM(m[3]);
    }
  }

  if (!dateObj || !from || !to) {
    print("INVALID FORMAT");
    return;
  }

  const ddmmm = formatDDMMM(dateObj);
  const dow = dayOfWeek2(dateObj);

  // Header proche de ton exemple
  print(`AN${ddmmm}${from}${to}`);
  print(`** AMADEUS AVAILABILITY - AN ** ${to}`);

  const baseFlights = [
    { airline: "PC", flightNo: 751, depTime: "0700", arrTime: "0925" },
    { airline: "PC", flightNo: 686, depTime: "1100", arrTime: "1325" },
    { airline: "SV", flightNo: 380, depTime: "1500", arrTime: "1725" },
    { airline: "AH", flightNo: 4038, depTime: "1900", arrTime: "2125" },
  ];

  // Classes type capture (dense)
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

  const mkAvail = () => {
    // 0..9 style Amadeus
    return classes.map((code, i) => {
      let seats;
      if (i < 3) seats = 9;
      else if (i < 7) seats = 4;
      else if (i < 10) seats = 9;
      else if (i < 14) seats = 4;
      else seats = 0;
      return { code, seats };
    });
  };

  const results = baseFlights.map((f, idx) => ({
    lineNo: idx + 1,
    airline: f.airline,
    flightNo: f.flightNo,
    from,
    to,
    dateDDMMM: ddmmm,
    dow,
    depTime: f.depTime,
    arrTime: f.arrTime,
    bookingClasses: mkAvail(),
  }));

  lastAN = { query: { from, to, ddmmm, dow }, results };

  results.forEach((r) => {
    const ln = String(r.lineNo); // "1" et pas "01"
    const airline = padR(r.airline, 2);
    const fno = padL(String(r.flightNo), 4, "0");

    const tokens = r.bookingClasses.map((x) => `${x.code}${x.seats}`);
    const wrapped = wrapTokens(tokens, 8); // 8 tokens par ligne (proche capture)
    const route = `/${r.from} ${r.to}`;

    // Ligne 1: "1  PC 0751  Y4 C4 ...    /ALG SAW"
    const line1 =
      `${ln}  ${airline} ${fno}  ` +
      padR(wrapped[0].join(" "), 34) +
      ` ${route}`;
    print(line1);

    // Ligne 2: "     L4 M4 ..."
    if (wrapped[1]) print(`     ${wrapped[1].join(" ")}`);
    if (wrapped[2]) print(`     ${wrapped[2].join(" ")}`);
  });
}

// -------------------------------
// SS (sell) - format A
// -------------------------------
function handleSS(cmdUpper) {
  if (!lastAN || !lastAN.results || lastAN.results.length === 0) {
    print("NO AVAILABILITY");
    return;
  }

  ensurePNR();

  const m = cmdUpper.match(/^SS(\d{1,2})([A-Z])(\d{0,2})$/);
  if (!m) {
    print("INVALID FORMAT");
    return;
  }

  const lineNo = parseInt(m[1], 10);
  const classCode = m[2];
  const paxCount = m[3] ? parseInt(m[3], 10) : 1;

  const item = lastAN.results.find((x) => x.lineNo === lineNo);
  if (!item) return void print("INVALID FORMAT");

  const cls = item.bookingClasses.find((x) => x.code === classCode);
  if (!cls) return void print("INVALID FORMAT");
  if (cls.seats <= 0) return void print("NO SEATS");
  if (paxCount > cls.seats) return void print("NOT ENOUGH SEATS");

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

  activePNR.itinerary.push(seg);

  // Réponse Selling Platform courte (évite le doublon)
  // Le PNR live affichera déjà le segment.
  print("OK");
  renderPNRLiveView();
}

// -------------------------------
// XE
// -------------------------------
function handleXE(cmdUpper) {
  if (!activePNR || !activePNR.itinerary) return void print("NO ACTIVE PNR");
  if (activePNR.itinerary.length === 0) return void print("NO SEGMENTS");

  if (cmdUpper === "XEALL") {
    activePNR.itinerary = [];
    print("ITINERARY CANCELLED");
    renderPNRLiveView();
    return;
  }

  let m = cmdUpper.match(/^XE(\d{1,2})$/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n < 1 || n > activePNR.itinerary.length)
      return void print("INVALID FORMAT");
    activePNR.itinerary.splice(n - 1, 1);
    print("SEGMENT CANCELLED");
    renderPNRLiveView();
    return;
  }

  m = cmdUpper.match(/^XE(\d{1,2})-(\d{1,2})$/);
  if (m) {
    let a = parseInt(m[1], 10);
    let b = parseInt(m[2], 10);
    if (a > b) [a, b] = [b, a];
    if (a < 1 || b > activePNR.itinerary.length)
      return void print("INVALID FORMAT");
    for (let i = b; i >= a; i--) activePNR.itinerary.splice(i - 1, 1);
    print("SEGMENTS CANCELLED");
    renderPNRLiveView();
    return;
  }

  print("INVALID FORMAT");
}

// -------------------------------
// CORE (async pour DAC/DAN en séquentiel si collé multi-lignes)
// -------------------------------
async function processCommand(cmd) {
  const raw = (cmd || "").trim();
  const c = raw.toUpperCase();

  if (!c) return;

  if (c === "AN") {
    print("AMADEUS SELLING PLATFORM");
    print("TRAINING MODE");
    return;
  }

  if (c === "JD") {
    print(new Date().toDateString().toUpperCase());
    return;
  }

  if (c === "HELP" || c === "HE") {
    print("AVAILABLE COMMANDS");
    print("ANddMMMXXXYYY       AVAILABILITY (ex: AN26DECALGPAR)");
    print("ANXXXYYY/ddMMM      AVAILABILITY (ex: ANALGPAR/26DEC)");
    print("SSnCn[pax]          SELL (ex: SS1Y1 / SS2M2 / SS1Y)");
    print("XE1 / XE1-3 / XEALL CANCEL");
    print("DAC XXX             DECODE IATA (ex: DAC ALG)");
    print("DAN <TEXT>          ENCODE SEARCH (ex: DAN PARIS)");
    print("NM                  NAME (MR/MRS optional, CHD/INF)");
    print("AP                  CONTACT");
    print("RF                  SIGNATURE (RFMM)");
    print("ER                  END PNR");
    print("RT                  DISPLAY PNR (same as live)");
    return;
  }

  // DAC
  if (c.startsWith("DAC")) {
    const m = c.match(/^DAC\s*([A-Z]{3})$/);
    if (!m) return void print("INVALID FORMAT");
    try {
      const lines = await cmdDAC(m[1]);
      lines.forEach(print);
    } catch (e) {
      console.error(e);
      print("INVALID FORMAT");
    }
    return;
  }

  // DAN
  if (c.startsWith("DAN")) {
    const text = raw.slice(3).trim();
    try {
      const lines = await cmdDAN(text);
      lines.forEach(print);
    } catch (e) {
      console.error(e);
      print("INVALID FORMAT");
    }
    return;
  }

  // AN
  if (c.startsWith("AN") && c.length > 2) {
    handleAN(c);
    return;
  }

  // SS / XE
  if (c.startsWith("SS")) return void handleSS(c);
  if (c.startsWith("XE")) return void handleXE(c);

  // NM (MR/MRS optionnel)
  if (c.startsWith("NM")) {
    ensurePNR();

    const chdMatch = c.match(
      /^NM\d+([A-Z]+)\/([A-Z]+)\s*\((CHD)(?:\/(\d{1,2}))?\)$/
    );
    const infMatch = c.match(/^NM\d+([A-Z]+)\/([A-Z]+)\s*\((INF)\)$/);
    const adultMatch = c.match(/^NM\d+([A-Z]+)\/([A-Z]+)(?:\s+(MR|MRS))?$/);

    if (chdMatch) {
      activePNR.passengers.push({
        lastName: chdMatch[1],
        firstName: chdMatch[2],
        type: "CHD",
        age: chdMatch[4] ? chdMatch[4] : null,
      });
      renderPNRLiveView();
      return;
    }

    if (infMatch) {
      activePNR.passengers.push({
        lastName: infMatch[1],
        firstName: infMatch[2],
        type: "INF",
      });
      renderPNRLiveView();
      return;
    }

    if (adultMatch) {
      activePNR.passengers.push({
        lastName: adultMatch[1],
        firstName: adultMatch[2],
        type: "ADT",
        title: adultMatch[3] || "",
      });
      renderPNRLiveView();
      return;
    }

    print("INVALID FORMAT");
    return;
  }

  // AP
  if (c.startsWith("AP")) {
    ensurePNR();
    activePNR.contacts.push(c);
    renderPNRLiveView();
    return;
  }

  // RF
  if (c.startsWith("RF")) {
    ensurePNR();
    if (c.startsWith("RF+")) return void print("INVALID FORMAT");
    const rfValue = c.substring(2).trim();
    if (!rfValue) return void print("INVALID FORMAT");
    activePNR.rf = rfValue;
    renderPNRLiveView();
    return;
  }

  // ER
  if (c === "ER") {
    if (!activePNR) return void print("NO ACTIVE PNR");
    if (!activePNR.passengers.length) return void print("END PNR FIRST");
    if (!activePNR.contacts.length) return void print("END PNR FIRST");
    if (!activePNR.rf) return void print("END PNR FIRST");

    activePNR.recordLocator = generateRecordLocator();
    activePNR.status = "RECORDED";
    print("PNR RECORDED");
    print("RECORD LOCATOR " + activePNR.recordLocator);
    renderPNRLiveView();
    return;
  }

  // RT
  if (c === "RT") {
    displayPNR();
    return;
  }

  print("INVALID FORMAT");
}

// -------------------------------
// QUEUE ENGINE (pour paste multi-lignes et enter)
// -------------------------------
function enqueueCommand(cmd) {
  const c = String(cmd || "").trim();
  if (!c) return;

  // history: on ajoute seulement si différent du dernier
  if (history.length === 0 || history[history.length - 1] !== c) {
    history.push(c);
  }
  historyPos = -1;

  commandQueue.push(c);
}

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    while (commandQueue.length > 0) {
      const cmd = commandQueue.shift();
      await executeCommandLine(cmd);
    }
  } finally {
    isProcessingQueue = false;
  }
}

async function executeCommandLine(command) {
  // Remplace la ligne input par la ligne commandée (comme Amadeus)
  const input = document.getElementById("commandInput");

  // si pas d'input (cas rare), on recrée
  if (!input) createNewPrompt();

  const input2 = document.getElementById("commandInput");
  if (input2) input2.disabled = true;

  const enteredLine = document.createElement("div");
  enteredLine.textContent = "> " + command;

  try {
    if (input2?.parentElement) {
      screen.insertBefore(enteredLine, input2.parentElement);
      input2.parentElement.remove();
    } else {
      screen.appendChild(enteredLine);
      input2?.remove();
    }

    try {
      await processCommand(command);
    } catch (err) {
      console.error(err);
      print("INVALID FORMAT");
    }
  } finally {
    createNewPrompt();
  }
}

// -------------------------------
// ENTER HANDLER UNIQUE (ANTI-DOUBLE)
// -------------------------------
let __ENTER_LOCK__ = false;

document.addEventListener(
  "keydown",
  function (e) {
    const isEnter =
      e.key === "Enter" || e.code === "Enter" || e.code === "NumpadEnter";
    if (!isEnter) return;

    const input = document.getElementById("commandInput");
    if (!input || input.disabled) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (__ENTER_LOCK__) return;
    __ENTER_LOCK__ = true;

    const command = input.value.trim();

    try {
      // même si vide, on avance (comme certains terminaux)
      enqueueCommand(command);
      void processQueue();
    } finally {
      __ENTER_LOCK__ = false;
    }
  },
  true
);

// -------------------------------
// INIT
// -------------------------------
createNewPrompt();

// Optionnel: vérifier DB chargée
DB?.ready?.()
  ?.then((x) => console.log("DB READY:", x))
  ?.catch((e) => console.warn("DB READY FAILED:", e));
