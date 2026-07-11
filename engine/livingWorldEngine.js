import { addUniverseNews } from "./newsEngine.js";

const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(v)));

const regionByCountry = country => {
  const c = (country ?? "").toLowerCase();
  if (["argentina", "mexico", "brasil", "brazil"].includes(c)) return "latinAmerica";
  if (["united states", "usa", "canada"].includes(c)) return "northAmerica";
  if (["japan", "china", "india", "thailand"].some(x => c.includes(x))) return "asia";
  return "europe";
};

export function ensureFanbase(entity, nationality = null) {
  entity.fanbase ??= {
    global: entity.popularity ?? entity.reputation ?? 50,
    homeCountry: entity.popularity ?? entity.reputation ?? 50,
    regions: { latinAmerica: 35, europe: 45, northAmerica: 35, asia: 35 }
  };
  entity.fanbase.regions ??= { latinAmerica: 35, europe: 45, northAmerica: 35, asia: 35 };
  const region = regionByCountry(nationality ?? entity.nationality);
  entity.fanbase.regions[region] = Math.max(entity.fanbase.regions[region] ?? 35, entity.fanbase.homeCountry ?? 50);
  return entity.fanbase;
}

export function initializeRelationships(world) {
  world.relationships ??= [];
  const key = (type, sourceId, targetId) => `${type}:${sourceId}:${targetId}`;
  const existing = new Set(world.relationships.map(r => key(r.type, r.sourceId, r.targetId)));
  const add = rel => {
    if (!existing.has(key(rel.type, rel.sourceId, rel.targetId))) {
      world.relationships.push(rel);
      existing.add(key(rel.type, rel.sourceId, rel.targetId));
    }
  };

  for (const team of world.teams) {
    add({ type: "manager_team", sourceType: "manager", sourceId: "manager", targetType: "team", targetId: team.id, value: team.id === world.userTeamId ? 72 : 50, trend: 0, reasons: ["Relación inicial de proyecto deportivo"] });
    const supplier = team.supplierContracts?.engineSupplierId;
    if (supplier) add({ type: "team_manufacturer", sourceType: "team", sourceId: team.id, targetType: "manufacturer", targetId: supplier, value: 62, trend: 0, reasons: ["Contrato técnico activo"] });
    for (const contract of team.sponsorContracts ?? []) {
      add({ type: "team_sponsor", sourceType: "team", sourceId: team.id, targetType: "sponsor", targetId: contract.sponsorId, value: contract.satisfaction ?? 60, trend: 0, reasons: ["Contrato comercial activo"] });
    }

    const drivers = team.drivers.map(id => world.drivers.find(d => d.id === id)).filter(Boolean);
    for (const driver of drivers) {
      add({ type: "driver_team", sourceType: "driver", sourceId: driver.id, targetType: "team", targetId: team.id, value: driver.driverHappiness ?? driver.morale ?? 65, trend: 0, reasons: ["Contrato activo"] });
      const engineer = (world.staff ?? []).find(s => s.teamId === team.id && s.role === "race_engineer");
      if (engineer) add({ type: "driver_engineer", sourceType: "driver", sourceId: driver.id, targetType: "staff", targetId: engineer.id, value: 58 + Math.round(((driver.attributes?.feedback ?? 70) - 70) / 4), trend: 0, reasons: ["Trabajo de setup y feedback"] });
      const principal = (world.staff ?? []).find(s => s.teamId === team.id && s.role === "team_principal");
      if (principal) add({ type: "driver_principal", sourceType: "driver", sourceId: driver.id, targetType: "staff", targetId: principal.id, value: 58, trend: 0, reasons: ["Relación con dirección deportiva"] });
      if (driver.academyId) add({ type: "driver_academy", sourceType: "driver", sourceId: driver.id, targetType: "academy", targetId: driver.academyId, value: driver.academyId === team.academyId ? 72 : 55, trend: 0, reasons: ["Vínculo de desarrollo"] });
      for (const contract of team.sponsorContracts ?? []) {
        add({ type: "driver_sponsor", sourceType: "driver", sourceId: driver.id, targetType: "sponsor", targetId: contract.sponsorId, value: Math.round(((driver.marketability ?? 55) + (contract.satisfaction ?? 60)) / 2), trend: 0, reasons: ["Valor comercial del piloto"] });
      }
    }

    if (drivers.length >= 2) {
      const delta = Math.abs((drivers[0].currentAbility ?? 70) - (drivers[1].currentAbility ?? 70));
      add({ type: "teammate", sourceType: "driver", sourceId: drivers[0].id, targetType: "driver", targetId: drivers[1].id, value: clamp(68 - delta, 35, 85), trend: 0, reasons: ["Competencia interna"] });
      add({ type: "teammate", sourceType: "driver", sourceId: drivers[1].id, targetType: "driver", targetId: drivers[0].id, value: clamp(68 - delta, 35, 85), trend: 0, reasons: ["Competencia interna"] });
    }
  }

  for (const driver of world.drivers) ensureFanbase(driver, driver.nationality);
  for (const team of world.teams) ensureFanbase(team);
  return world.relationships;
}

export function relationshipBetween(world, type, sourceId, targetId) {
  return (world.relationships ?? []).find(r => r.type === type && r.sourceId === sourceId && r.targetId === targetId);
}

export function tickRelationships(world) {
  initializeRelationships(world);
  for (const rel of world.relationships) {
    rel.value = clamp((rel.value ?? 50) + (rel.trend ?? 0) * .25);
    rel.trend = Math.max(-5, Math.min(5, (rel.trend ?? 0) * .85));
    rel.reasons = (rel.reasons ?? []).slice(-4);
    if (rel.value < 32 && Math.random() < .03) addUniverseNews(world, "Tensión creciente", "Una relación interna muestra señales de desgaste en el paddock.", "warning", null, "Relaciones", "normal");
  }
}

export function updateReputationsAfterRace(world, raceResult) {
  const top = raceResult.results?.slice(0, 3) ?? [];
  for (const [index, result] of top.entries()) {
    const driver = world.drivers.find(d => d.id === result.driverId);
    const team = world.teams.find(t => t.id === result.teamId);
    if (driver) {
      driver.reputation = clamp((driver.reputation ?? 50) + (index === 0 ? 2 : 1));
      driver.popularity = clamp((driver.popularity ?? 50) + (index === 0 ? 2 : 1));
      boostFanbase(driver, index === 0 ? 2 : 1);
    }
    if (team) {
      team.reputation = clamp((team.reputation ?? 50) + (index === 0 ? 1.2 : .5));
      boostFanbase(team, index === 0 ? 1.4 : .5);
    }
  }
  for (const result of raceResult.results?.filter(r => r.retired) ?? []) {
    const team = world.teams.find(t => t.id === result.teamId);
    if (team) team.reputation = clamp((team.reputation ?? 50) - .4);
  }
}

export function updateReputationsEndSeason(world) {
  for (const category of world.categories) {
    const state = world.categoryStates?.[category.id];
    if (!state) continue;
    for (const row of state.driverStandings.slice(0, 5)) {
      const driver = world.drivers.find(x => x.id === row.driverId);
      if (driver) {
        driver.reputation = clamp((driver.reputation ?? 50) + (6 - row.position) * .7);
        boostFanbase(driver, (6 - row.position) * .5);
      }
    }
    for (const row of state.teamStandings.slice(0, 3)) {
      const team = world.teams.find(x => x.id === row.teamId);
      if (team) {
        team.reputation = clamp((team.reputation ?? 50) + (4 - row.position) * .8);
        boostFanbase(team, (4 - row.position) * .5);
      }
    }
  }
  world.managerReputation = clamp((world.managerReputation ?? 50) + ((world.teams.find(t => t.id === world.userTeamId)?.reputation ?? 50) - 70) / 25);
}

export function boostFanbase(entity, amount = 1) {
  const fanbase = ensureFanbase(entity);
  fanbase.global = clamp(fanbase.global + amount);
  fanbase.homeCountry = clamp(fanbase.homeCountry + amount * 1.2);
  for (const key of Object.keys(fanbase.regions)) fanbase.regions[key] = clamp(fanbase.regions[key] + amount * .35);
}
