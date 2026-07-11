const top = (items, value, limit = 10) =>
  [...items].sort((a, b) => value(b) - value(a)).slice(0, limit);

function add(map, id, patch) {
  if (!id) return;
  const row = map.get(id) ?? { id, championships: 0, wins: 0, podiums: 0, points: 0, seasons: 0 };
  for (const [key, value] of Object.entries(patch)) row[key] = (row[key] ?? 0) + value;
  map.set(id, row);
}

export function buildMotorsportArchive(world) {
  const seasons = world.history?.seasons ?? [];
  const drivers = new Map();
  const teams = new Map();
  const champions = [];
  const transfers = [];
  const retired = [];

  for (const season of seasons) {
    for (const [categoryId, category] of Object.entries(season.categories ?? {})) {
      add(drivers, category.driversChampion, { championships: 1 });
      add(teams, category.teamsChampion, { championships: 1 });
      champions.push({
        season: season.season,
        categoryId,
        driverId: category.driversChampion,
        teamId: category.teamsChampion
      });

      for (const row of category.driverStandings ?? []) {
        add(drivers, row.driverId, {
          points: row.points ?? 0,
          wins: row.wins ?? 0,
          podiums: row.podiums ?? 0,
          seasons: 1
        });
      }

      for (const row of category.teamStandings ?? []) {
        add(teams, row.teamId, {
          points: row.points ?? 0,
          wins: row.wins ?? 0,
          podiums: row.podiums ?? 0,
          seasons: 1
        });
      }

      for (const move of category.majorTransfers ?? []) transfers.push({ season: season.season, categoryId, text: move });
      for (const driverId of category.retiredDrivers ?? []) retired.push({ season: season.season, categoryId, driverId });
    }
  }

  return {
    seasonsCount: seasons.length,
    champions,
    records: {
      driverTitles: top([...drivers.values()], r => r.championships),
      driverWins: top([...drivers.values()], r => r.wins),
      driverPodiums: top([...drivers.values()], r => r.podiums),
      driverPoints: top([...drivers.values()], r => r.points),
      teamTitles: top([...teams.values()], r => r.championships),
      teamWins: top([...teams.values()], r => r.wins),
      teamPoints: top([...teams.values()], r => r.points)
    },
    timeline: {
      transfers: transfers.slice(0, 20),
      retired: retired.slice(0, 20),
      news: seasons.flatMap(s => (s.majorNews ?? []).map(n => ({ ...n, season: s.season }))).slice(0, 24)
    }
  };
}
