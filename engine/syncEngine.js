/** Reconciles the bidirectional team/driver relationship after any roster mutation. */
export function syncTeamsAndDrivers(gameState) {
  const driverMap = new Map(gameState.drivers.map(driver => [driver.id, driver]));
  const teamMap = new Map(gameState.teams.map(team => [team.id, team]));
  const categoryMap = new Map(gameState.categories.map(category => [category.id, category]));
  const claimed = new Set();

  for (const team of gameState.teams) {
    const slots = categoryMap.get(team.categoryId)?.driversPerTeam ?? 2;
    const unique = [...new Set(Array.isArray(team.drivers) ? team.drivers : [])];
    let accepted = 0;
    team.drivers = unique.filter(driverId => {
      const driver = driverMap.get(driverId);
      if (!driver || driver.retired || driver.teamId !== team.id || claimed.has(driverId) || accepted >= slots) return false;
      claimed.add(driverId); accepted++;
      return true;
    }).slice(0, slots);
  }

  for (const driver of gameState.drivers) {
    if (driver.retired || !driver.teamId || !teamMap.has(driver.teamId)) {
      driver.teamId = null;
      if (!driver.retired) driver.categoryId = "free_agents";
      continue;
    }
    const team = teamMap.get(driver.teamId);
    const slots = categoryMap.get(team.categoryId)?.driversPerTeam ?? 2;
    if (driver.categoryId !== team.categoryId || claimed.has(driver.id) && !team.drivers.includes(driver.id)) {
      driver.teamId = null;
      driver.categoryId = "free_agents";
      continue;
    }
    if (!team.drivers.includes(driver.id)) {
      if (team.drivers.length < slots) { team.drivers.push(driver.id); claimed.add(driver.id); }
      else { driver.teamId = null; driver.categoryId = "free_agents"; }
    }
  }

  for (const team of gameState.teams) {
    team.drivers = [...new Set(team.drivers)].filter(id => {
      const driver = driverMap.get(id);
      return driver && !driver.retired && driver.teamId === team.id;
    });
  }
  return gameState;
}

export function rosterIssues(gameState) {
  const ids = new Set(gameState.drivers.map(driver => driver.id));
  const assigned = new Set();
  const issues = [];
  for (const team of gameState.teams) for (const id of team.drivers) {
    if (!ids.has(id)) issues.push(`Piloto inexistente ${id} en ${team.id}`);
    if (assigned.has(id)) issues.push(`Piloto duplicado ${id}`);
    assigned.add(id);
  }
  for (const driver of gameState.drivers) if (driver.retired && driver.teamId) issues.push(`Retirado ${driver.id} con equipo`);
  return issues;
}
