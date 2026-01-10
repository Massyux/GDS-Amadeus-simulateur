// core/engine.js
// Le "cerveau" des commandes (AN / NM / RF / ER / RT / ...)
// Dépend de window.__amadeus (fourni par script.js)

window.processCommand = async function processCommand(cmd) {
  const api = window.__amadeus;
  if (!api) {
    console.error("window.__amadeus not found (script.js not ready)");
    return;
  }

  const raw = (cmd || "").trim();
  const c = raw.toUpperCase();
  if (!c) return;

  const print = api.print;

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
      const lines = await api.cmdDAC(m[1]);
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
      const lines = await api.cmdDAN(text);
      lines.forEach(print);
    } catch (e) {
      console.error(e);
      print("INVALID FORMAT");
    }
    return;
  }

  // AN
  if (c.startsWith("AN") && c.length > 2) {
    api.handleAN(c);
    return;
  }

  // SS / XE
  if (c.startsWith("SS")) return void api.handleSS(c);
  if (c.startsWith("XE")) return void api.handleXE(c);

  // NM
  if (c.startsWith("NM")) {
    api.ensurePNR();
    const pnr = api.getActivePNR();

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
      api.renderPNRLiveView();
      return;
    }

    if (infMatch) {
      pnr.passengers.push({
        lastName: infMatch[1],
        firstName: infMatch[2],
        type: "INF",
      });
      api.renderPNRLiveView();
      return;
    }

    if (adultMatch) {
      pnr.passengers.push({
        lastName: adultMatch[1],
        firstName: adultMatch[2],
        type: "ADT",
        title: adultMatch[3] || "",
      });
      api.renderPNRLiveView();
      return;
    }

    print("INVALID FORMAT");
    return;
  }

  // AP
  if (c.startsWith("AP")) {
    api.ensurePNR();
    const pnr = api.getActivePNR();
    pnr.contacts.push(c);
    api.renderPNRLiveView();
    return;
  }

  // RF
  if (c.startsWith("RF")) {
    api.ensurePNR();
    const pnr = api.getActivePNR();
    if (c.startsWith("RF+")) return void print("INVALID FORMAT");
    const rfValue = c.substring(2).trim();
    if (!rfValue) return void print("INVALID FORMAT");
    pnr.rf = rfValue;
    api.renderPNRLiveView();
    return;
  }

  // ER
  if (c === "ER") {
    const pnr = api.getActivePNR();
    if (!pnr) return void print("NO ACTIVE PNR");
    if (!pnr.passengers.length) return void print("END PNR FIRST");
    if (!pnr.contacts.length) return void print("END PNR FIRST");
    if (!pnr.rf) return void print("END PNR FIRST");

    pnr.recordLocator = api.generateRecordLocator();
    pnr.status = "RECORDED";
    print("PNR RECORDED");
    print("RECORD LOCATOR " + pnr.recordLocator);
    api.renderPNRLiveView();
    return;
  }

  // RT
  if (c === "RT") {
    api.displayPNR();
    return;
  }

  print("INVALID FORMAT");
};
