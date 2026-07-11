import { getDriverStat, getTeamStat, safeRaceNumber } from "./statUtils.js";

const randomNormal = () => Math.random() + Math.random() + Math.random() + Math.random() - 2;
const importance = value => (safeRaceNumber(value, 70)) / 100;

function qualifyingScore(driver, team, circuit, rules, wet) {
  const q = importance(circuit.qualifyingImportance), engine = importance(circuit.engineImportance), aero = importance(circuit.aeroImportance), street = circuit.streetCircuit ? 1 : 0;
  return getTeamStat(team, "carPerformance", 70) * .22
    + getTeamStat(team, "engine", 70) * .13 * engine
    + getTeamStat(team, "aerodynamics", 70) * .14 * aero
    + getTeamStat(team, "chassis", 70) * .07
    + getDriverStat(driver, "speed") * .12
    + getDriverStat(driver, "qualifying") * (.13 + .08 * q)
    + getDriverStat(driver, "pressure") * .035 * street
    + getDriverStat(driver, "consistency") * .025 * street
    + (wet ? getDriverStat(driver, "wetSkill") * .09 : 0)
    + randomNormal() * safeRaceNumber(rules.randomness, 6) * .72;
}

function raceScore(driver, team, circuit, rules, wet, grid) {
  const w = rules.weights, engine = importance(circuit.engineImportance), aero = importance(circuit.aeroImportance), braking = importance(circuit.brakingImportance), traction = importance(circuit.tractionImportance), street = circuit.streetCircuit ? 1 : 0;
  const car = (getTeamStat(team, "carPerformance", 70) * .3 + getTeamStat(team, "engine", 70) * .22 * engine + getTeamStat(team, "aerodynamics", 70) * .22 * aero + getTeamStat(team, "chassis", 70) * .14 + getTeamStat(team, "strategy", 70) * .12) * safeRaceNumber(w.car, 1);
  const driverScore = getDriverStat(driver, "speed") * safeRaceNumber(w.speed, .1)
    + getDriverStat(driver, "qualifying") * safeRaceNumber(w.qualifying, .1)
    + getDriverStat(driver, "racePace") * safeRaceNumber(w.racePace, .1)
    + getDriverStat(driver, "consistency") * safeRaceNumber(w.consistency, .1)
    + getDriverStat(driver, "experience") * safeRaceNumber(w.experience, .08)
    + getDriverStat(driver, "aggression") * safeRaceNumber(w.aggression, .05)
    + getDriverStat(driver, "overtaking") * .025 * braking
    + getDriverStat(driver, "adaptability") * .025 * traction
    + (getDriverStat(driver, "pressure") + getDriverStat(driver, "consistency")) * .025 * street
    + (wet ? getDriverStat(driver, "wetSkill") * .1 : 0);
  const tyrePenalty = (100 - getDriverStat(driver, "tyreManagement")) * importance(circuit.tyreWear) * .055;
  const safetyNoise = safeRaceNumber(rules.randomness, 6) * (1 + importance(circuit.safetyCarChance) * .35) * (1.32 - getDriverStat(driver, "consistency") / 190);
  return car + driverScore + getTeamStat(team, "strategy", 70) * safeRaceNumber(w.strategy, .08) - tyrePenalty - safeRaceNumber(grid, 1) * .1 + randomNormal() * safetyNoise;
}

function retirement(driver, team, circuit, rules) {
  const mechanical = (100 - getTeamStat(team, "reliability", 75)) / 100 * .12;
  const incident = Math.max(0, getDriverStat(driver, "aggression") - 76) / 750 + importance(circuit.safetyCarChance) * .012;
  const chance = safeRaceNumber(rules.baseReliabilityRisk, .02) + mechanical + incident;
  if (Math.random() >= chance) return null;
  return Math.random() < .62 ? "Fallo mecánico" : "Incidente en pista";
}

export function simulateRace({ category, teams, drivers, circuit, season, round }) {
  const rules = category.raceRules, wet = Math.random() * 100 < safeRaceNumber(circuit.rainProbability ?? circuit.wetChance, 10);
  const entrants = drivers.filter(d => d.categoryId === category.id && d.teamId);
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));
  const qualifying = entrants.map(driver => ({ driver, team: teamMap[driver.teamId], score: qualifyingScore(driver, teamMap[driver.teamId], circuit, rules, wet) })).filter(e => e.team).sort((a, b) => b.score - a.score);
  const classified = qualifying.map((entry, index) => {
    const cause = retirement(entry.driver, entry.team, circuit, rules);
    return { driverId: entry.driver.id, teamId: entry.team.id, grid: index + 1, retired: Boolean(cause), cause, score: raceScore(entry.driver, entry.team, circuit, rules, wet, index + 1) };
  }).sort((a, b) => Number(a.retired) - Number(b.retired) || b.score - a.score);
  const leader = safeRaceNumber(classified[0]?.score, 80), baseSeconds = safeRaceNumber(circuit.laps, 50) * safeRaceNumber(circuit.lengthKm, 5) * 48;
  const results = classified.map((entry, index) => {
    const position = index + 1, rawGap = entry.retired ? null : Math.max(0, (leader - safeRaceNumber(entry.score, leader)) * 1.7 + index * .65);
    const gap = index === 0 ? 0 : rawGap;
    return { ...entry, score: safeRaceNumber(entry.score, leader), position, points: entry.retired ? 0 : (category.pointsSystem[index] ?? 0), time: entry.retired ? null : baseSeconds + safeRaceNumber(gap, 0), gap };
  });
  return { id: `s${season}-${category.id}-r${round}`, season, round, categoryId: category.id, circuitId: circuit.id, weather: wet ? "Lluvia" : "Seco", safetyCar: Math.random() * 100 < safeRaceNumber(circuit.safetyCarChance, 10), results };
}

export function formatRaceTime(seconds) {
  if (seconds == null) return "RET";
  const safe = safeRaceNumber(seconds, 0), hours = Math.floor(safe / 3600), minutes = Math.floor(safe % 3600 / 60), secs = (safe % 60).toFixed(3).padStart(6, "0");
  return `${hours}:${String(minutes).padStart(2, "0")}:${secs}`;
}
