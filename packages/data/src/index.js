export function createInMemoryStore() {
  return new InMemoryStore();
}

export function createLocationProvider(store) {
  if (!store) {
    throw new Error("store is required");
  }
  return {
    decodeIata: (code) => store.cmdDAC(code),
    searchByText: (text) => store.cmdDAN(text),
    findByIata: (code) => store.findByIata(code),
  };
}

export function createCountryProvider(store) {
  if (!store) {
    throw new Error("store is required");
  }
  return {
    lookup: (text) => store.cmdDC(text),
  };
}

export function createAirlineProvider(store) {
  if (!store) {
    throw new Error("store is required");
  }
  return {
    lookup: (text) => store.cmdDNA(text),
  };
}

class InMemoryStore {
  constructor() {
    this.loaded = false;
    this.byIata = new Map();

    // ✅ évite les doubles chargements simultanés
    this._loadingPromise = null;

    this.countriesLoaded = false;
    this.byCountryCode = new Map();
    this._countriesLoadingPromise = null;

    this.airlinesLoaded = false;
    this.byAirlineCode = new Map();
    this.byAirlineNumeric = new Map();
    this._airlinesLoadingPromise = null;
  }

  async loadFromArray(locations = []) {
    this.byIata.clear();

    for (const loc of locations) {
      const code = String(loc.iata || "")
        .trim()
        .toUpperCase();
      if (code) this.byIata.set(code, { ...loc, iata: code });
    }

    this.loaded = true;
  }

  async loadFromUrl(fetcher = fetch, url = "/data/locations.json") {
    // ✅ si déjà chargé => rien à faire
    if (this.loaded) return;

    // ✅ si un chargement est déjà en cours => on attend le même
    if (this._loadingPromise) {
      await this._loadingPromise;
      return;
    }

    // ✅ démarre un seul chargement
    this._loadingPromise = (async () => {
      const res = await fetcher(url);
      if (!res.ok) throw new Error("Cannot load locations");

      const locations = await res.json();
      await this.loadFromArray(locations);
    })();

    try {
      await this._loadingPromise;
    } finally {
      // ✅ reset même si erreur
      this._loadingPromise = null;
    }
  }

  async ensureLoaded() {
    // Intentionally no-op:
    // - le UI (Terminal.jsx) garantit le load avant processCommand
    // - sinon cmdDAC/cmdDAN renverront NO MATCH si pas chargé
    return;
  }

  async findByIata(iata) {
    await this.ensureLoaded();
    const code = String(iata || "")
      .trim()
      .toUpperCase();
    return this.byIata.get(code) || null;
  }

  async cmdDAC(code) {
    await this.ensureLoaded();
    const iata = String(code || "")
      .trim()
      .toUpperCase();

    if (!/^[A-Z]{3}$/.test(iata)) return ["INVALID FORMAT"];

    const loc = this.byIata.get(iata);
    if (!loc) return ["NO MATCH"];

    const lines = [];
    lines.push(`DAC ${iata}`);
    lines.push(`CODE TYPE CITY / COUNTRY`);
    lines.push(
      `${loc.iata}  ${loc.type || "A"}   ${loc.city} / ${loc.country}`
    );
    lines.push(`NAME: ${loc.name}`);
    if (loc.region) lines.push(`REGION: ${loc.region}`);

    return lines;
  }

  async cmdDAN(text) {
    await this.ensureLoaded();
    const q = String(text || "").trim();
    if (!q) return ["INVALID FORMAT"];

    const Q = q.toUpperCase();
    const res = [];

    for (const loc of this.byIata.values()) {
      const hay =
        `${loc.iata} ${loc.city} ${loc.name} ${loc.country} ${loc.region}`.toUpperCase();
      if (hay.includes(Q)) res.push(loc);
      if (res.length >= 25) break;
    }

    if (res.length === 0) return [`DAN ${Q}`, "NO MATCH"];

    return [
      `DAN ${Q}`,
      `CODE TYPE CITY - NAME / COUNTRY`,
      ...res.map(
        (loc) =>
          `${loc.iata}  ${loc.type || "A"}   ${loc.city} - ${loc.name} / ${
            loc.country
          }`
      ),
    ];
  }

  async loadCountriesFromArray(countries = []) {
    this.byCountryCode.clear();

    for (const country of countries) {
      const code = String(country.code || "")
        .trim()
        .toUpperCase();
      if (code) this.byCountryCode.set(code, { ...country, code });
    }

    this.countriesLoaded = true;
  }

  async loadCountriesFromUrl(fetcher = fetch, url = "/data/countries.json") {
    if (this.countriesLoaded) return;

    if (this._countriesLoadingPromise) {
      await this._countriesLoadingPromise;
      return;
    }

    this._countriesLoadingPromise = (async () => {
      const res = await fetcher(url);
      if (!res.ok) throw new Error("Cannot load countries");

      const countries = await res.json();
      await this.loadCountriesFromArray(countries);
    })();

    try {
      await this._countriesLoadingPromise;
    } finally {
      this._countriesLoadingPromise = null;
    }
  }

  async loadAirlinesFromArray(airlines = []) {
    this.byAirlineCode.clear();
    this.byAirlineNumeric.clear();

    for (const airline of airlines) {
      const code = String(airline.code || "")
        .trim()
        .toUpperCase();
      const numeric = String(airline.numeric || "").trim();
      if (code) {
        this.byAirlineCode.set(code, { ...airline, code, numeric });
        if (numeric) this.byAirlineNumeric.set(numeric, { ...airline, code, numeric });
      }
    }

    this.airlinesLoaded = true;
  }

  async loadAirlinesFromUrl(fetcher = fetch, url = "/data/airlines.json") {
    if (this.airlinesLoaded) return;

    if (this._airlinesLoadingPromise) {
      await this._airlinesLoadingPromise;
      return;
    }

    this._airlinesLoadingPromise = (async () => {
      const res = await fetcher(url);
      if (!res.ok) throw new Error("Cannot load airlines");

      const airlines = await res.json();
      await this.loadAirlinesFromArray(airlines);
    })();

    try {
      await this._airlinesLoadingPromise;
    } finally {
      this._airlinesLoadingPromise = null;
    }
  }

  // DC -- encode/decode country + nationality (docs/COMMANDES-MANQUANTES.md
  // Priorite 2). Same encode/decode duality as DAC/DAN, one command instead
  // of two: a 2-letter input decodes a code, anything else searches by text.
  async cmdDC(query) {
    const q = String(query || "").trim();
    if (!q) return ["INVALID FORMAT"];

    const Q = q.toUpperCase();

    if (/^[A-Z]{2}$/.test(Q)) {
      const country = this.byCountryCode.get(Q);
      if (!country) return [`DC ${Q}`, "NO MATCH"];
      return [
        `DC ${Q}`,
        "CODE  COUNTRY / NATIONALITY",
        `${country.code}    ${country.name} / ${country.nationality}`,
      ];
    }

    const res = [];
    for (const country of this.byCountryCode.values()) {
      const hay = `${country.code} ${country.name} ${country.nationality}`.toUpperCase();
      if (hay.includes(Q)) res.push(country);
      if (res.length >= 25) break;
    }

    if (res.length === 0) return [`DC ${Q}`, "NO MATCH"];

    return [
      `DC ${Q}`,
      "CODE  COUNTRY / NATIONALITY",
      ...res.map((country) => `${country.code}    ${country.name} / ${country.nationality}`),
    ];
  }

  // DNA -- encode/decode airline (docs/COMMANDES-MANQUANTES.md Priorite 2).
  // Three input shapes: 2-3 digit numeric ticketing code, 2-character IATA
  // code, or free text (name search) -- mirrors the DAC/DAN duality but in
  // a single command, per the mission's own examples (DNA DELTA / DNA AF /
  // DNA 057).
  async cmdDNA(query) {
    const q = String(query || "").trim();
    if (!q) return ["INVALID FORMAT"];

    const Q = q.toUpperCase();

    if (/^\d{1,4}$/.test(Q)) {
      const airline = this.byAirlineNumeric.get(Q) || this.byAirlineNumeric.get(Q.padStart(3, "0"));
      if (!airline) return [`DNA ${Q}`, "NO MATCH"];
      return [
        `DNA ${Q}`,
        "CODE  NUMERIC  NAME",
        `${airline.code}    ${airline.numeric}     ${airline.name}`,
      ];
    }

    if (/^[A-Z0-9]{2}$/.test(Q)) {
      const airline = this.byAirlineCode.get(Q);
      if (!airline) return [`DNA ${Q}`, "NO MATCH"];
      return [
        `DNA ${Q}`,
        "CODE  NUMERIC  NAME",
        `${airline.code}    ${airline.numeric}     ${airline.name}`,
      ];
    }

    const res = [];
    for (const airline of this.byAirlineCode.values()) {
      const hay = `${airline.code} ${airline.name}`.toUpperCase();
      if (hay.includes(Q)) res.push(airline);
      if (res.length >= 25) break;
    }

    if (res.length === 0) return [`DNA ${Q}`, "NO MATCH"];

    return [
      `DNA ${Q}`,
      "CODE  NUMERIC  NAME",
      ...res.map((airline) => `${airline.code}    ${airline.numeric}     ${airline.name}`),
    ];
  }

  async ready() {
    return { locationsCount: this.byIata.size };
  }
}
