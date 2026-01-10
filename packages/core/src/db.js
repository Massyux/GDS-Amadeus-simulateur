let loaded = false;
const byIata = new Map();

async function loadLocations(fetcher = fetch, url = "/data/locations.json") {
  if (loaded) return;

  const res = await fetcher(url);
  if (!res.ok) {
    throw new Error("Cannot load locations");
  }

  const locations = await res.json();

  byIata.clear();
  for (const loc of locations) {
    const code = String(loc.iata || "")
      .trim()
      .toUpperCase();
    if (code) byIata.set(code, { ...loc, iata: code });
  }

  loaded = true;
}

export async function findByIata(iata, options = {}) {
  await loadLocations(options.fetcher, options.url);
  const code = String(iata || "")
    .trim()
    .toUpperCase();
  return byIata.get(code) || null;
}

export async function cmdDAC(code, options = {}) {
  await loadLocations(options.fetcher, options.url);

  const iata = String(code || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{3}$/.test(iata)) return ["INVALID FORMAT"];

  const loc = byIata.get(iata);
  if (!loc) return ["NO MATCH"];

  const lines = [];
  lines.push(`DAC ${iata}`);
  lines.push(`CODE TYPE CITY / COUNTRY`);
  lines.push(`${loc.iata}  ${loc.type || "A"}   ${loc.city} / ${loc.country}`);
  lines.push(`NAME: ${loc.name}`);
  if (loc.region) lines.push(`REGION: ${loc.region}`);
  return lines;
}

export async function cmdDAN(text, options = {}) {
  await loadLocations(options.fetcher, options.url);

  const q = String(text || "").trim();
  if (!q) return ["INVALID FORMAT"];

  const Q = q.toUpperCase();
  const res = [];

  for (const loc of byIata.values()) {
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
        `${loc.iata}  ${loc.type || "A"}   ${loc.city} - ${loc.name} / ${loc.country}`
    ),
  ];
}

export const DB = {
  ready: async (options = {}) => {
    await loadLocations(options.fetcher, options.url);
    return { locationsCount: byIata.size };
  },
};
