import { syncTeamsAndDrivers } from "./syncEngine.js";
import { addUniverseNews } from "./newsEngine.js";
import { clampDriverAttributes } from "./driverAttributeUtils.js";

const firstNames = ["Alex", "Noa", "Luca", "Maya", "Iker", "Sofia", "Leo", "Nina", "Tom", "Ari", "Kai", "Emma"];
const lastNames = ["Costa", "Müller", "Rossi", "Silva", "Tanaka", "Martin", "Novak", "Pérez", "Kim", "Smith", "Dubois", "Berg"];
const nationalities = ["Argentina", "Brasil", "Italia", "Japón", "Alemania", "Francia", "España", "Canadá", "Suecia", "México"];
const clamp = value => Math.max(35, Math.min(96, Math.round(value)));

function regenFanbase(nationality, serial) {
  const regions = { latinAmerica: serial % 31, europe: (serial * 3) % 31, northAmerica: (serial * 5) % 31, asia: (serial * 7) % 31, oceania: serial % 21, middleEast: (serial * 2) % 21 };
  const n = (nationality ?? "").toLowerCase();
  const strong = n.includes("arg") || n.includes("br") || n.includes("méx") || n.includes("mex") ? "latinAmerica" : n.includes("jap") ? "asia" : n.includes("can") ? "northAmerica" : "europe";
  regions[strong] = Math.max(regions[strong], 28 + (serial % 18));
  return { global: 5 + (serial % 16), homeCountry: 20 + (serial % 26), regions };
}

export function generateYoungDrivers(world, count, categoryId) {
  const category = world.categories.find(c => c.id === categoryId);
  const created = [];
  for (let i = 0; i < count; i++) {
    const serial = (world.generatedDriverSerial ?? 0) + 1;
    world.generatedDriverSerial = serial;
    const base = 58 + (serial % 9);
    const name = `${firstNames[serial % firstNames.length]} ${lastNames[(serial * 3) % lastNames.length]}`;
    const attr = offset => clamp(base + offset + (serial % 5));
    const attributes = { speed: attr(4), qualifying: attr(3), racePace: attr(2), consistency: attr(0), overtaking: attr(2), defending: attr(-1), wetSkill: attr(1), tyreManagement: attr(0), raceStarts: attr(-2), feedback: attr(-1), adaptability: attr(4), pressure: attr(-1), aggression: attr(3) };
    const potentialAbilityMax = 78 + (serial % 19);
    const currentAbility = Math.min(95, base + 2);
    const nationality = nationalities[(serial * 7) % nationalities.length];
    const driver = {
      id: `academy-${world.currentSeason}-${serial}`,
      name,
      number: (serial * 11) % 98 + 1,
      age: 16 + (serial % 5),
      birthDate: `${world.currentSeason - (16 + serial % 5)}-01-01`,
      nationality,
      countryCode: "XX",
      categoryId: "free_agents",
      teamId: null,
      academyId: "independent",
      marketValue: 450000 + serial % 8 * 90000,
      salary: 90000 + serial % 6 * 20000,
      contractUntil: world.currentSeason,
      currentAbility,
      potentialAbilityMin: Math.max(currentAbility + 4, potentialAbilityMax - 8),
      potentialAbilityMax,
      potentialStarsVisible: Math.max(2, Math.min(5, Math.round((potentialAbilityMax - 55) / 9))),
      scoutSummary: "Talento generado con margen de desarrollo todavía incierto.",
      potential: potentialAbilityMax,
      reputation: 36 + serial % 12,
      morale: 75,
      fitness: 94,
      experience: 28 + serial % 12,
      popularity: 35,
      marketability: 30 + serial % 45,
      fanbase: regenFanbase(nationality, serial),
      drivingStyle: ["All-Rounder", "Aggressive Attacker", "Technical Developer"][serial % 3],
      personality: ["Ambitious", "Professional", "Reserved"][serial % 3],
      traits: ["generated_young_driver"],
      generated: true,
      attributes,
      ...attributes
    };
    clampDriverAttributes(driver);
    world.drivers.push(driver);
    created.push(driver);
  }
  if (created.length) addUniverseNews(world, "Nueva generación", `${created.length} jóvenes talentos ingresan al mercado para ${category?.name ?? "la escalera junior"}.`, "positive", categoryId);
  return created;
}

function rating(driver) {
  const a = driver.attributes ?? {};
  return driver.currentAbility ?? (a.speed * .2 + a.racePace * .22 + a.qualifying * .12 + a.consistency * .12 + a.overtaking * .08 + a.tyreManagement * .08 + driver.experience * .08 + (driver.potentialAbilityMax ?? driver.potential) * .1);
}

function teamInterest(team, driver) {
  const philosophy = team.teamPhilosophy ?? "balanced";
  const ca = rating(driver), pa = driver.potentialAbilityMax ?? driver.potential ?? ca, age = driver.age ?? 24, budgetFit = team.budget > driver.salary * 1.4 ? 8 : -10, academy = team.academyId && team.academyId === driver.academyId ? 7 : 0;
  const topTeamPenalty = team.categoryId === "apex-gp" && team.reputation >= 85 && age <= 21 ? -22 : 0;
  const weights = { youth_development: pa * 1.05 + (24 - age) * 1.8, star_drivers: ca * 1.15 + (driver.reputation ?? 50) * .45, aggressive_results: ca * 1.22 + (driver.reputation ?? 50) * .35, technical_excellence: ca * .9 + (driver.feedback ?? driver.attributes?.feedback ?? 60) * .45, budget_efficiency: ca * .8 + budgetFit * 2, commercial_focus: ca * .75 + (driver.marketability ?? 50) * .7, manufacturer_project: ca * .86 + (driver.marketability ?? 50) * .25, patient_project: pa * 1.05 + (25 - age) * 1.1, balanced: ca + pa * .25 };
  return (weights[philosophy] ?? weights.balanced) + budgetFit + academy + topTeamPenalty;
}

function moveDriver(world, driver, team) {
  const oldTeam = world.teams.find(t => t.id === driver.teamId);
  if (oldTeam) oldTeam.drivers = oldTeam.drivers.filter(id => id !== driver.id);
  const weakest = team.drivers.map(id => world.drivers.find(d => d.id === id)).filter(Boolean).sort((a, b) => rating(a) - rating(b))[0];
  if (weakest) {
    weakest.teamId = null;
    weakest.categoryId = "free_agents";
    weakest.contractStatus = "free_agent";
    team.drivers = team.drivers.filter(id => id !== weakest.id);
  }
  driver.categoryId = team.categoryId;
  driver.teamId = team.id;
  driver.contractUntil = world.currentSeason + 2;
  driver.contractStatus = "signed";
  driver.role = driver.age <= 21 ? "junior_driver" : "second_driver";
  driver.contractValue = (driver.salary ?? 0) * 2;
  team.drivers.push(driver.id);
  team.budget -= Math.round((driver.salary ?? 0) * .15);
  return weakest;
}

export function processCategoryPromotions(world) {
  const categories = [...world.categories].sort((a, b) => b.level - a.level);
  const moves = [];
  for (let i = 0; i < categories.length - 1; i++) {
    const source = categories[i], target = categories[i + 1], standing = world.categoryStates[source.id]?.driverStandings ?? [];
    const maxPromotions = target.id === "apex-gp" ? 1 : 2;
    const candidates = standing.slice(0, source.level === 3 ? 4 : 6).map((row, index) => ({ driver: world.drivers.find(d => d.id === row.driverId), index })).filter(x => x.driver).filter(({ driver, index }) => {
      const contractBonus = driver.contractUntil <= world.currentSeason + 1 ? .08 : 0;
      const chance = source.promotionWeight * .30 + (driver.currentAbility ?? rating(driver)) / 330 + (driver.potentialAbilityMax ?? driver.potential) / 380 + (driver.reputation ?? 40) / 650 + contractBonus - index * .07;
      return chance > .66;
    }).map(x => x.driver).slice(0, maxPromotions);
    const targetTeams = world.teams.filter(t => t.categoryId === target.id && t.budget > 150000 && !(target.id === "apex-gp" && t.reputation >= 88)).sort((a, b) => teamInterest(a, candidates[0] ?? {}) - teamInterest(b, candidates[0] ?? {}));
    for (const [index, driver] of candidates.entries()) {
      const team = [...targetTeams].sort((a, b) => teamInterest(b, driver) - teamInterest(a, driver))[index % targetTeams.length];
      if (!team) continue;
      const displaced = moveDriver(world, driver, team);
      moves.push(`${driver.name} asciende de ${source.shortName} a ${target.shortName} con ${team.name}`);
      addUniverseNews(world, "Ascenso confirmado", `${driver.name} sube a ${target.name} con ${team.name}.`, "positive", target.id);
      if (displaced) addUniverseNews(world, "Asiento perdido", `${displaced.name} queda libre tras el movimiento de mercado de ${team.name}.`, "warning", target.id);
    }
  }
  syncTeamsAndDrivers(world);
  return moves;
}

export function processRetirements(world) {
  const retired = [];
  for (const driver of world.drivers.filter(d => !d.retired && d.age >= 35)) {
    if (Math.random() < (driver.age - 33) * .1) {
      const team = world.teams.find(t => t.id === driver.teamId);
      if (team) team.drivers = team.drivers.filter(id => id !== driver.id);
      driver.retired = true;
      driver.teamId = null;
      driver.categoryId = "free_agents";
      retired.push(driver);
      addUniverseNews(world, "Retiro del paddock", `${driver.name} anuncia su retiro al final de la temporada.`, "warning", driver.categoryId);
    }
  }
  return retired;
}

export function fillEmptySeats(world) {
  syncTeamsAndDrivers(world);
  const signed = [];
  for (const team of world.teams) {
    const slots = world.categories.find(c => c.id === team.categoryId)?.driversPerTeam ?? 2;
    while (team.drivers.length < slots) {
      let candidates = world.drivers.filter(d => !d.retired && !d.teamId && (d.categoryId === "free_agents" || d.categoryId === team.categoryId || d.categoryId == null));
      if (!candidates.length) {
        const lowest = [...world.categories].sort((a, b) => b.level - a.level)[0];
        generateYoungDrivers(world, 1, lowest.id);
        candidates = world.drivers.filter(d => !d.retired && !d.teamId);
      }
      candidates.sort((a, b) => rating(b) + (b.potential ?? 0) * .08 + (b.reputation ?? 0) * .06 - (rating(a) + (a.potential ?? 0) * .08 + (a.reputation ?? 0) * .06));
      const pick = candidates[0];
      if (!pick) break;
      pick.teamId = team.id;
      pick.categoryId = team.categoryId;
      pick.contractUntil = world.currentSeason + 2;
      pick.contractStatus = "signed";
      team.drivers.push(pick.id);
      signed.push({ teamId: team.id, driverId: pick.id });
    }
  }
  syncTeamsAndDrivers(world);
  return signed;
}
