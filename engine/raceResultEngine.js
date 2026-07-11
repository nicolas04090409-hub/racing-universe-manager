import { recalculateCategoryStandings } from "./categoryEngine.js";
import { addUniverseNews } from "./newsEngine.js";
import { updateReputationsAfterRace } from "./livingWorldEngine.js";
import { safeRaceNumber } from "./statUtils.js";

export function getRaceResultForRound(world, categoryId, round) {
  return (world.raceResults ?? []).find(r => r.categoryId === categoryId && r.round === round && r.season === world.currentSeason) ?? null;
}

export function sanitizeRaceResult(world, categoryId, round, raceResult) {
  const result = { ...raceResult, categoryId, round, season: world.currentSeason };
  result.results = (result.results ?? []).map((row, index) => {
    const retired = Boolean(row.retired);
    return {
      ...row,
      position: safeRaceNumber(row.position, index + 1),
      grid: safeRaceNumber(row.grid, index + 1),
      score: safeRaceNumber(row.score, 80 - index),
      points: safeRaceNumber(row.points, 0),
      gap: retired ? null : safeRaceNumber(row.gap, index === 0 ? 0 : index * 1.2),
      time: retired ? null : safeRaceNumber(row.time, 5400 + index * 1.2),
      retired
    };
  });
  return result;
}

export function commitRaceResult(world, categoryId, round, raceResult, { clearWeekend = false, generateNews = true } = {}) {
  const existing = getRaceResultForRound(world, categoryId, round);
  if (existing) {
    if (clearWeekend) world.activeWeekend = null;
    return existing;
  }
  const result = sanitizeRaceResult(world, categoryId, round, raceResult);
  world.raceResults ??= [];
  world.raceResults.push(result);
  const state = world.categoryStates[categoryId];
  if (state) {
    state.completedRaces ??= [];
    if (!state.completedRaces.includes(result.id)) state.completedRaces.push(result.id);
    state.currentRound = Math.max(state.currentRound ?? 1, round + 1);
    state.lastRaceResult = result.id;
    recalculateCategoryStandings(world, categoryId);
  }
  updateReputationsAfterRace(world, result);
  if (generateNews) {
    const category = world.categories.find(c => c.id === categoryId);
    const winner = world.drivers.find(d => d.id === result.results?.[0]?.driverId);
    addUniverseNews(world, `Victoria de ${winner?.name ?? "un piloto"}`, `${winner?.name ?? "Un piloto"} gana la ronda ${round} de ${category?.shortName ?? categoryId}.`, "result", categoryId, "Carrera");
  }
  if (clearWeekend) world.activeWeekend = null;
  world.updatedAt = new Date().toISOString();
  return result;
}
