/**
 * @typedef {Object} DataStore
 * @property {(code: string) => Promise<string[]>|string[]} decodeIata
 * @property {(text: string) => Promise<string[]>|string[]} encodeCity
 * @property {(params: {from: string, to: string, ddmmm: string, dow: string}) => Array<object>} searchFlights
 * @property {(userId: string, pnr: object) => Promise<string|null>|string|null} savePNR
 * @property {(userId: string, recordLocator: string) => Promise<object|null>|object|null} loadPNR
 */

const DEFAULT_FLIGHTS = [
  { airline: "PC", flightNo: 751, depTime: "0700", arrTime: "0925" },
  { airline: "PC", flightNo: 686, depTime: "1100", arrTime: "1325" },
  { airline: "SV", flightNo: 380, depTime: "1500", arrTime: "1725" },
  { airline: "AH", flightNo: 4038, depTime: "1900", arrTime: "2125" },
];

const DEFAULT_CLASSES = [
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

export class InMemoryStore {
  constructor(options = {}) {
    this.locationsByIata = new Map();
    this.locations = [];
    this.flights = options.flights ?? DEFAULT_FLIGHTS;
    this.classes = options.classes ?? DEFAULT_CLASSES;
    this.pnrs = new Map();
  }

  seedLocations(locations) {
    this.locationsByIata.clear();
    this.locations = Array.isArray(locations) ? [...locations] : [];
    for (const loc of this.locations) {
      const code = String(loc.iata || "")
        .trim()
        .toUpperCase();
      if (code) this.locationsByIata.set(code, { ...loc, iata: code });
    }
  }

  decodeIata(code) {
    const iata = String(code || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{3}$/.test(iata)) return ["INVALID FORMAT"];

    const loc = this.locationsByIata.get(iata);
    if (!loc) return ["NO MATCH"];

    const lines = [];
    lines.push(`DAC ${iata}`);
    lines.push("CODE TYPE CITY / COUNTRY");
    lines.push(`${loc.iata}  ${loc.type || "A"}   ${loc.city} / ${loc.country}`);
    lines.push(`NAME: ${loc.name}`);
    if (loc.region) lines.push(`REGION: ${loc.region}`);
    return lines;
  }

  encodeCity(text) {
    const q = String(text || "").trim();
    if (!q) return ["INVALID FORMAT"];

    const Q = q.toUpperCase();
    const res = [];

    for (const loc of this.locationsByIata.values()) {
      const hay =
        `${loc.iata} ${loc.city} ${loc.name} ${loc.country} ${loc.region}`.toUpperCase();
      if (hay.includes(Q)) res.push(loc);
      if (res.length >= 25) break;
    }

    if (res.length === 0) return [`DAN ${Q}`, "NO MATCH"];

    return [
      `DAN ${Q}`,
      "CODE TYPE CITY - NAME / COUNTRY",
      ...res.map(
        (loc) =>
          `${loc.iata}  ${loc.type || "A"}   ${loc.city} - ${loc.name} / ${loc.country}`
      ),
    ];
  }

  searchFlights({ from, to, ddmmm, dow }) {
    const mkAvail = () => {
      return this.classes.map((code, i) => {
        let seats;
        if (i < 3) seats = 9;
        else if (i < 7) seats = 4;
        else if (i < 10) seats = 9;
        else if (i < 14) seats = 4;
        else seats = 0;
        return { code, seats };
      });
    };

    return this.flights.map((flight, idx) => ({
      lineNo: idx + 1,
      airline: flight.airline,
      flightNo: flight.flightNo,
      from,
      to,
      dateDDMMM: ddmmm,
      dow,
      depTime: flight.depTime,
      arrTime: flight.arrTime,
      bookingClasses: mkAvail(),
    }));
  }

  savePNR(userId, pnr) {
    if (!userId || !pnr?.recordLocator) return null;
    const key = `${userId}:${pnr.recordLocator}`;
    this.pnrs.set(key, pnr);
    return pnr.recordLocator;
  }

  loadPNR(userId, recordLocator) {
    if (!userId || !recordLocator) return null;
    const key = `${userId}:${recordLocator}`;
    return this.pnrs.get(key) || null;
  }
}

export class SeedLoader {
  constructor(store) {
    this.store = store;
  }

  loadLocations(locations) {
    this.store.seedLocations(locations);
    return { locationsCount: this.store.locations.length };
  }

  async loadFromUrl(url, fetcher = fetch) {
    const res = await fetcher(url);
    if (!res.ok) {
      throw new Error("Cannot load locations");
    }
    const locations = await res.json();
    return this.loadLocations(locations);
  }
}
