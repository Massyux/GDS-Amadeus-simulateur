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
  };
}

class InMemoryStore {
  constructor() {
    this.loaded = false;
    this.byIata = new Map();

    // ✅ évite les doubles chargements simultanés
    this._loadingPromise = null;
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

  async ready() {
    return { locationsCount: this.byIata.size };
  }
}
