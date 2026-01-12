import { cmdDAC, cmdDAN } from "./db.js";

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

function wrapTokens(tokens, maxPerLine) {
  const out = [];
  for (let i = 0; i < tokens.length; i += maxPerLine) {
    out.push(tokens.slice(i, i + maxPerLine));
  }
  return out;
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
    };
  } else {
    state.activePNR.passengers ||= [];
    state.activePNR.contacts ||= [];
    state.activePNR.itinerary ||= [];
    state.activePNR.ssr ||= [];
    state.activePNR.osi ||= [];
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

function renderPNRLiveView(state) {
  if (!state.activePNR) {
    return ["NO ACTIVE PNR"];
  }

  const lines = [];
  let n = 1;

  if (state.activePNR.passengers.length > 0) {
    let row = [];
    for (const p of state.activePNR.passengers) {
      row.push(`${n}. ${paxDisplay(p)}`);
      n++;
      if (row.length === 3) {
        lines.push(row.join("  "));
        row = [];
      }
    }
    if (row.length) lines.push(row.join("  "));
  }

  if (state.activePNR.itinerary.length > 0) {
    const decorated = state.activePNR.itinerary.map((s, idx) => {
      const d = ddmmmToDate(s.dateDDMMM);
      const t = d ? d.getTime() : Number.POSITIVE_INFINITY;
      return { s, idx, t };
    });
    decorated.sort((a, b) => (a.t !== b.t ? a.t - b.t : a.idx - b.idx));

    for (const item of decorated) {
      lines.push(`${padL(n, 2)} ${segmentLineForPNR(item.s)}`);
      n++;
    }
  }

  for (const ap of state.activePNR.contacts) {
    lines.push(`${padL(n, 2)} ${ap}`);
    n++;
  }

  for (const x of state.activePNR.ssr) {
    lines.push(`${padL(n, 2)} SSR ${x}`);
    n++;
  }
  for (const x of state.activePNR.osi) {
    lines.push(`${padL(n, 2)} OSI ${x}`);
    n++;
  }

  if (state.activePNR.rf) {
    lines.push(`${padL(n, 2)} RF ${state.activePNR.rf}`);
    n++;
  }

  if (state.activePNR.recordLocator) {
    lines.push(`${padL(n, 2)} REC LOC ${state.activePNR.recordLocator}`);
    n++;
  }

  return lines;
}

function handleAN(state, cmdUpper) {
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
    return { error: "INVALID FORMAT" };
  }

  const ddmmm = formatDDMMM(dateObj);
  const dow = dayOfWeek2(dateObj);

  const lines = [];
  lines.push(`AN${ddmmm}${from}${to}`);
  lines.push(`** AMADEUS AVAILABILITY - AN ** ${to}`);

  const baseFlights = [
    { airline: "PC", flightNo: 751, depTime: "0700", arrTime: "0925" },
    { airline: "PC", flightNo: 686, depTime: "1100", arrTime: "1325" },
    { airline: "SV", flightNo: 380, depTime: "1500", arrTime: "1725" },
    { airline: "AH", flightNo: 4038, depTime: "1900", arrTime: "2125" },
  ];

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

  state.lastAN = { query: { from, to, ddmmm, dow }, results };

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

function handleSS(state, cmdUpper) {
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

  const lines = ["OK", ...renderPNRLiveView(state)];
  return { lines };
}

function handleXE(state, cmdUpper) {
  if (!state.activePNR || !state.activePNR.itinerary) {
    return { error: "NO ACTIVE PNR" };
  }
  if (state.activePNR.itinerary.length === 0) return { error: "NO SEGMENTS" };

  if (cmdUpper === "XEALL") {
    state.activePNR.itinerary = [];
    return { lines: ["ITINERARY CANCELLED", ...renderPNRLiveView(state)] };
  }

  let m = cmdUpper.match(/^XE(\d{1,2})$/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n < 1 || n > state.activePNR.itinerary.length)
      return { error: "INVALID FORMAT" };
    state.activePNR.itinerary.splice(n - 1, 1);
    return { lines: ["SEGMENT CANCELLED", ...renderPNRLiveView(state)] };
  }

  m = cmdUpper.match(/^XE(\d{1,2})-(\d{1,2})$/);
  if (m) {
    let a = parseInt(m[1], 10);
    let b = parseInt(m[2], 10);
    if (a > b) [a, b] = [b, a];
    if (a < 1 || b > state.activePNR.itinerary.length)
      return { error: "INVALID FORMAT" };
    for (let i = b; i >= a; i--) state.activePNR.itinerary.splice(i - 1, 1);
    return { lines: ["SEGMENTS CANCELLED", ...renderPNRLiveView(state)] };
  }

  return { error: "INVALID FORMAT" };
}

export function createInitialState() {
  return {
    activePNR: null,
    lastAN: null,
  };
}

export async function processCommand(state, cmd, options = {}) {
  const events = [];
  const print = (text) => events.push({ type: "print", text: String(text) });
  const raw = (cmd || "").trim();
  const c = raw.toUpperCase();
  if (!c) return { events, state };

  if (c === "AN") {
    print("AMADEUS SELLING PLATFORM");
    print("TRAINING MODE");
    return { events, state };
  }

  if (c === "JD") {
    print(new Date().toDateString().toUpperCase());
    return { events, state };
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
    return { events, state };
  }

  if (c.startsWith("DAC")) {
    const m = c.match(/^DAC\s*([A-Z]{3})$/);
    if (!m) {
      print("INVALID FORMAT");
      return { events, state };
    }
    try {
      const locations = options.locations;
      const lines =
        locations && typeof locations.cmdDAC === "function"
          ? await locations.cmdDAC(m[1])
          : await cmdDAC(m[1], locations);
      lines.forEach(print);
    } catch (e) {
      print("INVALID FORMAT");
    }
    return { events, state };
  }

  if (c.startsWith("DAN")) {
    const text = raw.slice(3).trim();
    try {
      const locations = options.locations;
      const lines =
        locations && typeof locations.cmdDAN === "function"
          ? await locations.cmdDAN(text)
          : await cmdDAN(text, locations);
      lines.forEach(print);
    } catch (e) {
      print("INVALID FORMAT");
    }
    return { events, state };
  }

  if (c.startsWith("AN") && c.length > 2) {
    const result = handleAN(state, c);
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines?.forEach(print);
    return { events, state };
  }

  if (c.startsWith("SS")) {
    const result = handleSS(state, c);
    if (result.error) {
      print(result.error);
      return { events, state };
    }
    result.lines?.forEach(print);
    return { events, state };
  }

  if (c.startsWith("XE")) {
    const result = handleXE(state, c);
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
    const adultMatch = c.match(/^NM\d+([A-Z]+)\/([A-Z]+)(?:\s+(MR|MRS))?$/);

    if (chdMatch) {
      pnr.passengers.push({
        lastName: chdMatch[1],
        firstName: chdMatch[2],
        type: "CHD",
        age: chdMatch[4] ? chdMatch[4] : null,
      });
      renderPNRLiveView(state).forEach(print);
      return { events, state };
    }

    if (infMatch) {
      pnr.passengers.push({
        lastName: infMatch[1],
        firstName: infMatch[2],
        type: "INF",
      });
      renderPNRLiveView(state).forEach(print);
      return { events, state };
    }

    if (adultMatch) {
      pnr.passengers.push({
        lastName: adultMatch[1],
        firstName: adultMatch[2],
        type: "ADT",
        title: adultMatch[3] || "",
      });
      renderPNRLiveView(state).forEach(print);
      return { events, state };
    }

    print("INVALID FORMAT");
    return { events, state };
  }

  if (c.startsWith("AP")) {
    ensurePNR(state);
    const pnr = state.activePNR;
    pnr.contacts.push(c);
    renderPNRLiveView(state).forEach(print);
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
    renderPNRLiveView(state).forEach(print);
    return { events, state };
  }

  if (c === "ER") {
    const pnr = state.activePNR;
    if (!pnr) {
      print("NO ACTIVE PNR");
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

    pnr.recordLocator = generateRecordLocator();
    pnr.status = "RECORDED";
    print("PNR RECORDED");
    print("RECORD LOCATOR " + pnr.recordLocator);
    renderPNRLiveView(state).forEach(print);
    return { events, state };
  }

  if (c === "RT") {
    renderPNRLiveView(state).forEach(print);
    return { events, state };
  }

  print("INVALID FORMAT");
  return { events, state };
}

