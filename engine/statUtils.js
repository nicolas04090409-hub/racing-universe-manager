export function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function getDriverStat(driver, statName, fallback = 70) {
  const direct = driver?.[statName];
  const nested = driver?.attributes?.[statName];
  return finiteNumber(direct ?? nested, fallback);
}

export function getTeamStat(team, statName, fallback = 70) {
  const direct = team?.[statName];
  const development = team?.carDevelopment?.[statName];
  return finiteNumber(direct ?? development, fallback);
}

export function safeRaceNumber(value, fallback = 0) {
  return finiteNumber(value, fallback);
}
