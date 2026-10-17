import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createInitialState, processCommand } from "@simulateur/core";
import {
  createInMemoryStore,
  createLocationProvider,
  createAirlineProvider,
} from "@simulateur/data";
import ficheCoverage from "./data/ficheCoverage.json";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(dirname, "../public/data");

const locations = JSON.parse(readFileSync(path.join(dataDir, "locations.json"), "utf8"));
const airlines = JSON.parse(readFileSync(path.join(dataDir, "airlines.json"), "utf8"));

// Prompt architecte du 16/10/2026 ("Elargir les donnees du simulateur pour
// qu'elles couvrent la formation") : chaque code publie dans les fiches de
// reference (D:/cowork/formation-amadeus-n1/fiches-pdf/03, 04, 05) doit
// repondre dans le simulateur -- sinon un eleve qui tape un code appris en
// cours croit s'etre trompe. `ficheCoverage.json` est une photographie figee
// de ces codes ET de leurs valeurs (transcrite le 16/10/2026, pas re-derivee
// des fichiers de donnees eux-memes -- sinon ce test ne verifierait jamais
// rien). Si une future fiche ajoute ou corrige un aeroport ou une compagnie,
// mettre a jour `ficheCoverage.json` fait partie de la tache -- ce test
// echouera tant que `locations.json`/`airlines.json` n'auront pas rattrape.
//
// Correction du 17/10/2026, apres coup : la premiere version de ce test ne
// verifiait que la PRESENCE d'un code, pas sa valeur -- elle n'aurait jamais
// detecte `TU` enregistre avec le prefixe numerique 083 (celui de South
// African Airways) au lieu de 199, une erreur restee invisible six mois en
// production. Desormais chaque compagnie est comparee sur `numeric` ET
// `name`, chaque aeroport sur `city` ET `country` -- pas seulement le code.
describe("Couverture simulateur <-> fiches de formation Amadeus niveau 1", () => {
  it("tous les codes aeroport/ville enseignes resolvent dans locations.json, avec la bonne ville et le bon pays", () => {
    const byIata = new Map(locations.map((l) => [l.iata, l]));
    const mismatches = [];
    for (const expected of ficheCoverage.locations) {
      const actual = byIata.get(expected.iata);
      if (!actual) {
        mismatches.push(`${expected.iata}: absent de locations.json`);
        continue;
      }
      if (actual.city !== expected.city || actual.country !== expected.country) {
        mismatches.push(
          `${expected.iata}: attendu ${expected.city}/${expected.country}, trouve ${actual.city}/${actual.country}`
        );
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("toutes les compagnies enseignees resolvent dans airlines.json, avec le bon prefixe numerique et le bon nom", () => {
    const byCode = new Map(airlines.map((a) => [a.code, a]));
    const mismatches = [];
    for (const expected of ficheCoverage.airlines) {
      const actual = byCode.get(expected.code);
      if (!actual) {
        mismatches.push(`${expected.code}: absent de airlines.json`);
        continue;
      }
      if (actual.numeric !== expected.numeric || actual.name !== expected.name) {
        mismatches.push(
          `${expected.code}: attendu ${expected.numeric}/${expected.name}, trouve ${actual.numeric}/${actual.name}`
        );
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("PAR, LON et NYC sont bien des codes de ville (type C), pas des aeroports", () => {
    const byIata = new Map(locations.map((l) => [l.iata, l]));
    for (const city of ["PAR", "LON", "NYC"]) {
      expect(byIata.get(city)?.type).toBe("C");
    }
  });

  it("chaque aeroport desservant une ville regroupee (PAR/LON/NYC) reste de type A", () => {
    const byIata = new Map(locations.map((l) => [l.iata, l]));
    for (const airportCode of ["CDG", "ORY", "BVA", "LHR", "LGW", "STN", "JFK", "EWR", "LGA"]) {
      expect(byIata.get(airportCode)?.type).toBe("A");
    }
  });

  it("aucun code n'est defini deux fois dans locations.json ou airlines.json", () => {
    const iataCounts = new Map();
    for (const l of locations) iataCounts.set(l.iata, (iataCounts.get(l.iata) || 0) + 1);
    const dupLocations = [...iataCounts.entries()].filter(([, n]) => n > 1).map(([k]) => k);
    expect(dupLocations).toEqual([]);

    const codeCounts = new Map();
    for (const a of airlines) codeCounts.set(a.code, (codeCounts.get(a.code) || 0) + 1);
    const dupAirlines = [...codeCounts.entries()].filter(([, n]) => n > 1).map(([k]) => k);
    expect(dupAirlines).toEqual([]);
  });
});

// Meme verification que le compte rendu demande de faire en production, mais
// rejouee automatiquement a chaque run de test, avec le VRAI moteur
// (packages/core) branche sur les VRAIS fichiers (packages/data), pas un
// mock -- c'est le meme cablage que Terminal.jsx (createInMemoryStore +
// createLocationProvider/createAirlineProvider), juste sans fetch() puisque
// le contenu est deja en memoire ici.
describe("Commandes reelles sur les nouveaux codes (DAC/DAN/AN/DNA)", () => {
  async function makeDeps() {
    const store = createInMemoryStore();
    await store.loadFromArray(locations);
    await store.loadAirlinesFromArray(airlines);
    return {
      locations: createLocationProvider(store),
      airlines: createAirlineProvider(store),
    };
  }

  function textOf(result) {
    return result.events.map((e) => e.text).join("\n");
  }

  it("DAC DXB et DAN DUBAI repondent (deja presents avant cette passe -- non-regression)", async () => {
    const deps = await makeDeps();
    const state = createInitialState();
    const dac = await processCommand(state, "DAC DXB", { deps });
    expect(textOf(dac)).toContain("DUBAI");
    const dan = await processCommand(dac.state, "DAN DUBAI", { deps });
    expect(textOf(dan)).toContain("DXB");
  });

  it("AN15DECALGIST et AN15DECALGDXB renvoient une disponibilite, pas NOT IN TABLE", async () => {
    const deps = await makeDeps();
    let state = createInitialState();
    for (const cmd of ["AN15DECALGIST", "AN15DECALGDXB"]) {
      const result = await processCommand(state, cmd, { deps });
      state = result.state;
      const text = textOf(result);
      expect(text).not.toContain("NOT IN TABLE");
      expect(text).toContain("AN15DEC");
    }
  });

  it("trois codes algeriens secondaires (TMR, BSK, GHA) repondent", async () => {
    const deps = await makeDeps();
    let state = createInitialState();
    for (const code of ["TMR", "BSK", "GHA"]) {
      const result = await processCommand(state, `DAC ${code}`, { deps });
      state = result.state;
      expect(textOf(result)).not.toContain("NO MATCH");
    }
  });

  it("trois compagnies (QR, EK, TK) resolvent via DNA", async () => {
    const deps = await makeDeps();
    let state = createInitialState();
    for (const code of ["QR", "EK", "TK"]) {
      const result = await processCommand(state, `DNA ${code}`, { deps });
      state = result.state;
      expect(textOf(result)).not.toContain("NO MATCH");
    }
  });

  it("un aeroport nouvellement ajoute par cette passe (CBH, Bechar) resout en DAC/DAN", async () => {
    const deps = await makeDeps();
    const state = createInitialState();
    const dac = await processCommand(state, "DAC CBH", { deps });
    expect(textOf(dac)).toContain("BECHAR");
    const dan = await processCommand(dac.state, "DAN BECHAR", { deps });
    expect(textOf(dan)).toContain("CBH");
  });

  it("une compagnie nouvellement ajoutee par cette passe (6R, Tassili) resout via DNA malgre un prefixe numerique vide", async () => {
    const deps = await makeDeps();
    const state = createInitialState();
    const result = await processCommand(state, "DNA 6R", { deps });
    expect(textOf(result)).toContain("TASSILI");
  });

  // Regression dediee : TU avait le prefixe numerique de South African
  // Airways (083) au lieu du sien (199), corrige le 17/10/2026 apres
  // verification architecte contre la liste IATA et le fichier de la
  // Chambre de compensation. SV renomme en SAUDIA (marque commerciale
  // imprimee sur la fiche distribuee aux eleves), sa denomination legale
  // (Saudi Arabian Airlines) etant volontairement differente de ce qu'un
  // eleve lit en cours.
  it("DNA TU renvoie le prefixe 199 (pas 083, celui de SA) ; DNA SV renvoie SAUDIA", async () => {
    const deps = await makeDeps();
    const state = createInitialState();
    const tu = await processCommand(state, "DNA TU", { deps });
    expect(textOf(tu)).toContain("199");
    expect(textOf(tu)).not.toContain("083");
    const sv = await processCommand(tu.state, "DNA SV", { deps });
    expect(textOf(sv)).toContain("SAUDIA");
    expect(textOf(sv)).not.toContain("SAUDI ARABIAN AIRLINES");
  });
});
