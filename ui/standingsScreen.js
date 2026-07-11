import { getCategory, getCategoryState, getDriver, getTeam, pageHead, teamChip, userTeam } from "./helpers.js";
import { filterButton } from "./components.js";

function scopeRows(rows, scope, world, mode) {
  if (scope === "top") return rows.slice(0, 10);
  if (scope === "mine") {
    const team = userTeam(world);
    if (mode === "teams") return rows.filter(r => r.teamId === team.id);
    const ids = new Set((team.drivers ?? []).map(d => typeof d === "string" ? d : d.id));
    return rows.filter(r => ids.has(r.driverId));
  }
  return rows;
}

function scopeControls(scope) {
  const chips = [["top", "Top 10"], ["all", "Todos"], ["mine", "Mi equipo"]];
  return `<div class="filter-row mobile-ranking-scope">${chips.map(([id, label]) => `<button class="filter-chip ${scope === id ? "active" : ""}" data-action="standings-scope" data-filter="${id}">${label}</button>`).join("")}</div>`;
}

export function renderStandingsScreen(world, mode = "drivers", scope = "top") {
  const category = getCategory(world);
  const state = getCategoryState(world);
  const champion = state.championDriverId ? getDriver(world, state.championDriverId) : null;
  const modeControls = `<div class="filter-row">${filterButton("drivers", "Pilotos", mode === "drivers").replace("market-filter", "standings-mode")}${filterButton("teams", "Equipos", mode === "teams").replace("market-filter", "standings-mode")}</div>${scopeControls(scope)}`;

  if (mode === "teams") {
    const rows = scopeRows(state.teamStandings, scope, world, mode);
    return `${pageHead("Campeonato de equipos", `${category.name} · Temporada ${world.currentSeason}`, modeControls)}
    ${championshipBars(world, state.teamStandings.slice(0,5), "teams")}
    <div class="compact-ranking-list standings-mobile-list">${rows.map((r, index) => { const team = getTeam(world, r.teamId), pos = r.position ?? index + 1; return `<div class="compact-ranking-row"><div class="compact-summary"><span class="rank">#${pos}</span><span class="name">${team?.shortName ?? team?.name ?? r.teamId}</span><strong>${r.points} pts</strong></div><div class="compact-row-details"><span>Victorias ${r.wins}</span><span>Equipo ${team?.name ?? "—"}</span></div></div>`; }).join("")}</div>
    <div class="table-wrap standings-desktop-table"><table class="data-table"><thead><tr><th>Pos</th><th>Equipo</th><th>Victorias</th><th>Puntos</th></tr></thead><tbody>${rows.map((r, index) => `<tr><td class="pos">${r.position ?? index + 1}</td><td>${teamChip(getTeam(world, r.teamId))}</td><td>${r.wins}</td><td><strong>${r.points}</strong></td></tr>`).join("")}</tbody></table></div>`;
  }

  const rows = scopeRows(state.driverStandings, scope, world, mode);
  return `${pageHead("Campeonato de pilotos", `${category.name} · Temporada ${world.currentSeason}${champion ? ` · Campeón: ${champion.name}` : ""}`, modeControls)}
  ${championshipBars(world, state.driverStandings.slice(0,5), "drivers")}
  <div class="compact-ranking-list standings-mobile-list">${rows.map((r, index) => { const d = getDriver(world, r.driverId), t = getTeam(world, d?.teamId), pos = r.position ?? index + 1; return `<button class="compact-ranking-row as-button" data-action="view-driver" data-driver="${d?.id}"><span class="rank">#${pos}</span><span class="name">${d?.name ?? r.driverId}</span><small>${t?.shortName ?? "—"} · ${r.wins} vict. · ${r.podiums} pod.</small><strong>${r.points} pts</strong></button>`; }).join("")}</div>
  <div class="table-wrap standings-desktop-table"><table class="data-table"><thead><tr><th>Pos</th><th>Piloto</th><th>Equipo</th><th>Victorias</th><th>Podios</th><th>Puntos</th></tr></thead><tbody>${rows.map((r, index) => { const d = getDriver(world, r.driverId); return `<tr><td class="pos">${r.position ?? index + 1}</td><td><button class="table-link" data-action="view-driver" data-driver="${d?.id}">${d?.name}</button></td><td>${teamChip(getTeam(world, d?.teamId))}</td><td>${r.wins}</td><td>${r.podiums}</td><td><strong>${r.points}</strong></td></tr>`; }).join("")}</tbody></table></div>`;
}

function championshipBars(world, rows, mode){
  const leader=Math.max(1,...rows.map(r=>r.points??0));
  return `<article class="card chart-card"><span class="metric-label">TOP 5 CAMPEONATO</span><h3>${mode==="teams"?"Equipos":"Pilotos"}</h3><div class="bar-chart">${rows.map(row=>{const name=mode==="teams"?(getTeam(world,row.teamId)?.shortName??row.teamId):(getDriver(world,row.driverId)?.name??row.driverId);const diff=(leader-(row.points??0));return`<div class="bar-row"><span>${name}</span><div class="bar-track"><em style="--now:${Math.round(((row.points??0)/leader)*100)}%"></em></div><strong>${row.points??0} pts${diff?` · -${diff}`:""}</strong></div>`}).join("")}</div></article>`;
}
