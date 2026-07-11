import { formatRaceTime } from "../engine/raceEngine.js";
import { allCategoriesComplete } from "../engine/worldEngine.js";
import { fakeDate, getCategory, getCategoryState, getDriver, getTeam, pageHead, teamChip, userTeam } from "./helpers.js";
import { emptyState } from "./components.js";

const safe = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const sign = value => value > 0 ? `+${value}` : String(value);

function driverIds(team) {
  return (team.drivers ?? []).map(d => typeof d === "string" ? d : d.id).filter(Boolean);
}

function circuitFacts(circuit) {
  if (!circuit) return "";
  return `<div class="race-facts">
    <div><span>Longitud</span><strong>${circuit.lengthKm} km</strong></div>
    <div><span>Vueltas</span><strong>${circuit.laps}</strong></div>
    <div><span>Desgaste</span><strong>${circuit.tyreWear}/100</strong></div>
    <div><span>Lluvia</span><strong>${circuit.rainProbability}%</strong></div>
    <div><span>Clasificación</span><strong>${circuit.qualifyingImportance}</strong></div>
    <div><span>Motor</span><strong>${circuit.engineImportance}</strong></div>
    <div><span>Aerodinámica</span><strong>${circuit.aeroImportance}</strong></div>
    <div><span>Safety Car</span><strong>${circuit.safetyCarChance}%</strong></div>
  </div>`;
}

function resultBySelection(completed, selectedRound) {
  if (!completed.length) return null;
  if (selectedRound === "next") return null;
  if (selectedRound === "latest" || !selectedRound) return completed.at(-1);
  return completed.find(r => String(r.round) === String(selectedRound)) ?? completed.at(-1);
}

function roundSelect(world, completed, selectedRound) {
  return `<label class="select-inline race-result-select"><span>Resultados anteriores</span><select data-race-round>
    <option value="latest" ${selectedRound === "latest" ? "selected" : ""}>Última carrera completada</option>
    <option value="next" ${selectedRound === "next" ? "selected" : ""}>Próxima carrera pendiente</option>
    ${completed.map(r => `<option value="${r.round}" ${String(selectedRound) === String(r.round) ? "selected" : ""}>R${r.round} · ${fakeDate(world.currentSeason, r.round)}</option>`).join("")}
  </select></label>`;
}

function controls(world, category, state, selectedRound, completed, complete, processing) {
  const playerView = category.id === world.currentCategoryId;
  const allDone = allCategoriesComplete(world);
  const disabledSingle = !playerView || complete || processing;
  const disabledGlobal = allDone || processing;
  const processingText = processing ? "Simulando..." : "Simular próxima carrera";
  return `<div class="race-mobile-actions card">
    <h3>Centro de carrera</h3>
    ${roundSelect(world, completed, selectedRound)}
    <div class="mobile-action-grid">
      <button class="button primary" data-action="simulate-race" ${disabledSingle ? "disabled" : ""}>${processingText}</button>
      <button class="button" data-action="start-weekend" ${disabledSingle ? "disabled" : ""}>Ir al Race Weekend</button>
      <button class="button" data-action="simulate-world" ${disabledGlobal ? "disabled" : ""}>Simular fin de semana global</button>
      <button class="button danger" data-action="simulate-season" ${disabledGlobal ? "disabled" : ""}>Simular temporada global</button>
      <button class="button good" data-action="finish-season" ${!allDone || processing ? "disabled" : ""}>Cerrar temporada</button>
    </div>
    <p class="muted">Después de simular, el resultado pasa arriba automáticamente. No hace falta buscarlo con scroll.</p>
  </div>
  <div class="actions race-toolbar">
    ${roundSelect(world, completed, selectedRound)}
    <button class="button primary" data-action="simulate-race" ${disabledSingle ? "disabled" : ""}>${processingText}</button>
    <button class="button" data-action="start-weekend" ${disabledSingle ? "disabled" : ""}>Race Weekend</button>
    <button class="button" data-action="simulate-world" ${disabledGlobal ? "disabled" : ""}>Simular fin de semana global</button>
    <button class="button danger" data-action="simulate-season" ${disabledGlobal ? "disabled" : ""}>Simular temporada global</button>
    <button class="button good" data-action="finish-season" ${!allDone || processing ? "disabled" : ""}>Cerrar temporada</button>
  </div>`;
}

function processingPanel(processing) {
  if (!processing) return "";
  const steps = processing.steps ?? ["Preparando grilla", "Simulando carrera", "Procesando resultados", "Actualizando universo"];
  return `<section class="card processing-panel" id="race-focus">
    <div class="spinner"></div>
    <div><span class="metric-label">PROCESANDO</span><h2>${processing.title ?? "Simulando carrera..."}</h2><p>${processing.message ?? "El muro de boxes está actualizando estrategia, resultado y campeonato."}</p></div>
    <ol class="processing-steps">${steps.map((step, index) => `<li class="${index <= (processing.stepIndex ?? 1) ? "active" : ""}">${step}</li>`).join("")}</ol>
  </section>`;
}

function positionDelta(result) {
  if (!Number.isFinite(Number(result.grid))) return { value: 0, label: "—", tone: "neutral" };
  const value = result.grid - result.position;
  return { value, label: value > 0 ? `▲ ${sign(value)}` : value < 0 ? `▼ ${value}` : "—", tone: value > 0 ? "good" : value < 0 ? "bad" : "neutral" };
}

function summaryFromRace(world, data, result, preSnapshot = null) {
  const team = userTeam(world);
  const ids = new Set(driverIds(team));
  const category = world.categories.find(c => c.id === result.categoryId);
  const circuit = data.circuits.find(c => c.id === result.circuitId);
  const state = world.categoryStates?.[result.categoryId];
  const teamStanding = state?.teamStandings?.find(r => r.teamId === team.id);
  const beforeTeam = preSnapshot?.teamStandings?.find(r => r.teamId === team.id);
  const playerResults = (result.results ?? []).filter(r => ids.has(r.driverId));
  const playerPoints = playerResults.reduce((sum, r) => sum + (r.points ?? 0), 0);
  const top = (result.results ?? []).slice(0, 3);
  const winner = getDriver(world, top[0]?.driverId);
  const driverChanges = playerResults.map(r => {
    const before = preSnapshot?.driverStandings?.find(row => row.driverId === r.driverId);
    const after = state?.driverStandings?.find(row => row.driverId === r.driverId);
    return { result: r, before, after };
  });
  return { team, category, circuit, state, result, top, winner, playerResults, playerPoints, teamStanding, beforeTeam, driverChanges };
}

function renderPostRaceSummary(world, data, result, preSnapshot = null, options = {}) {
  const summary = summaryFromRace(world, data, result, preSnapshot);
  const headline = summary.winner ? `${summary.winner.name} gana en ${summary.circuit?.name ?? "la carrera"}` : "Carrera finalizada";
  return `<section class="post-race-focus ${options.sheet ? "post-race-sheet" : ""}" id="race-focus">
    <article class="card post-race-hero">
      <div><span class="metric-label">RESULTADO DE CARRERA</span><h2>${summary.circuit?.name ?? result.circuitId}</h2><p>${summary.category?.name ?? result.categoryId} · Ronda ${result.round} · ${result.weather ?? "Clima variable"} · ${summary.circuit?.laps ?? "?"} vueltas</p></div>
      <div class="winner-badge"><span>Ganador</span><strong>${summary.winner?.name ?? "—"}</strong></div>
    </article>
    <div class="race-podium post-podium">${[summary.top[1], summary.top[0], summary.top[2]].map((r, i) => r ? `<div class="podium-step ${i === 1 ? "first" : i === 0 ? "second" : "third"}"><span class="pos">P${r.position}</span><strong>${getDriver(world, r.driverId)?.name ?? "Piloto"}</strong><small>${getTeam(world, r.teamId)?.shortName ?? "Equipo"} · ${r.points ?? 0} pts</small></div>` : "").join("")}</div>
    <div class="grid two">
      <article class="card"><h3>Tu equipo</h3>${summary.playerResults.map(r => {
        const driver = getDriver(world, r.driverId);
        const delta = positionDelta(r);
        return `<div class="player-result-card">
          <div><span class="metric-label">${driver?.name ?? r.driverId}</span><h3>P${r.position}</h3></div>
          <div class="mobile-stat-grid"><span>Largó <b>P${r.grid ?? "—"}</b></span><span>Terminó <b>P${r.position}</b></span><span class="${delta.tone}">Cambio <b>${delta.label}</b></span><span>Puntos <b>${r.points ?? 0}</b></span></div>
          <p>Estrategia: ${(r.tyresUsed ?? []).join(" → ") || "Sin datos"} · Paradas ${r.pits ?? 0}${r.retired ? ` · ${r.cause ?? "Retirado"}` : ""}</p>
        </div>`;
      }).join("") || `<p class="muted">No hay pilotos del jugador en este resultado.</p>`}</article>
      <article class="card"><h3>Campeonato actualizado</h3>
        <div class="standing-line"><b>Constructores</b><span>P${summary.beforeTeam?.position ?? "—"} → P${summary.teamStanding?.position ?? "—"}</span><strong>+${summary.playerPoints} pts</strong></div>
        ${summary.driverChanges.map(({ result: r, before, after }) => `<div class="standing-line"><b>${getDriver(world, r.driverId)?.name?.split(" ").at(-1) ?? r.driverId}</b><span>P${before?.position ?? "—"} → P${after?.position ?? "—"}</span><strong>${after?.points ?? 0} pts</strong></div>`).join("")}
        <h3>Noticias principales</h3>
        <p>${headline}.</p>
        ${result.safetyCar ? `<p>Safety Car alteró la estrategia final.</p>` : ""}
        ${(result.events ?? []).slice(0, 2).map(e => `<p>${e.description ?? e.message ?? e.type}</p>`).join("")}
      </article>
    </div>
    <div class="actions post-race-actions">
      <button class="button primary" data-action="view-full-race-result">Ver clasificación completa</button>
      <button class="button" data-action="go" data-screen="standings">Ver campeonato actualizado</button>
      <button class="button" data-action="go" data-screen="dashboard">Ir al Paddock</button>
      <button class="button" data-action="go" data-screen="race-weekend">Ver estrategia</button>
      <button class="button ghost" data-action="dismiss-race-summary">Continuar</button>
    </div>
  </section>`;
}

function renderSeasonSummary(world, data, races) {
  if (!races?.length) return "";
  const team = userTeam(world);
  const category = getCategory(world);
  const state = getCategoryState(world);
  const championDriver = getDriver(world, state.driverStandings?.[0]?.driverId);
  const championTeam = getTeam(world, state.teamStandings?.[0]?.teamId);
  const teamRow = state.teamStandings?.find(r => r.teamId === team.id);
  const driverRows = state.driverStandings?.filter(r => driverIds(team).includes(r.driverId)) ?? [];
  return `<section class="post-race-focus season-summary" id="race-focus">
    <article class="card post-race-hero"><div><span class="metric-label">TEMPORADA SIMULADA</span><h2>${category.name}</h2><p>${races.length} carreras procesadas · calendario listo para cerrar</p></div><div class="winner-badge"><span>Campeón</span><strong>${championDriver?.name ?? "—"}</strong></div></article>
    <div class="grid two">
      <article class="card"><h3>Campeones</h3><div class="standing-line"><b>Pilotos</b><span>${championDriver?.name ?? "—"}</span><strong>${state.driverStandings?.[0]?.points ?? 0} pts</strong></div><div class="standing-line"><b>Equipos</b><span>${championTeam?.name ?? "—"}</span><strong>${state.teamStandings?.[0]?.points ?? 0} pts</strong></div></article>
      <article class="card"><h3>Tu equipo</h3><div class="standing-line"><b>Constructores</b><span>${team.name}</span><strong>P${teamRow?.position ?? "—"}</strong></div>${driverRows.map(r => `<div class="standing-line"><b>${getDriver(world, r.driverId)?.name ?? r.driverId}</b><span>${r.points} pts</span><strong>P${r.position}</strong></div>`).join("")}<p>Balance proyectado: <strong>${team.projectedBalance ?? 0}</strong></p></article>
    </div>
    <div class="actions"><button class="button good" data-action="finish-season">Cerrar temporada</button><button class="button" data-action="go" data-screen="standings">Ver campeonato</button><button class="button" data-action="go" data-screen="dashboard">Ir al Paddock</button></div>
  </section>`;
}

function renderStoredRace(world, data, result, preSnapshot = null, focused = false) {
  const circuit = data.circuits.find(c => c.id === result.circuitId);
  const results = result.results ?? [];
  const incidents = (result.events ?? []).slice(0, 5);
  return `${focused ? renderPostRaceSummary(world, data, result, preSnapshot) : ""}
  ${!focused ? pageHead(`Resultado guardado: ${circuit?.name ?? result.circuitId}`, `${result.weather ?? "Clima variable"}${result.safetyCar ? " · Safety Car" : ""} · Ronda ${result.round} · ${result.raceWeekend ? "Race Weekend" : "Simulación rápida"}`) : ""}
  ${circuitFacts(circuit)}
  <div class="compact-ranking-list race-result-compact">${results.map(r => `<button class="compact-ranking-row as-button full-race-row ${r.retired ? "is-dnf" : ""}" data-action="view-driver" data-driver="${r.driverId}"><span class="rank">#${r.position}</span><span class="name">${getDriver(world, r.driverId)?.name?.split(" ").at(-1) ?? r.driverId}</span><small>${getTeam(world, r.teamId)?.shortName ?? "—"} · ${r.retired ? `DNF · ${r.cause ?? "Retirado"}` : r.position === 1 ? "Ganador" : `+${safe(r.gap).toFixed(3)}s`}</small><strong>${r.points ?? 0} pts</strong></button>`).join("")}</div>
  <div class="table-wrap race-desktop-table"><table class="data-table"><thead><tr><th>Pos</th><th>Piloto</th><th>Equipo</th><th>Parrilla</th><th>Gap / Estado</th><th>Boxes</th><th>Puntos</th></tr></thead><tbody>${results.map(r => `<tr>
    <td class="pos">${r.position}</td>
    <td><button class="table-link" data-action="view-driver" data-driver="${r.driverId}">${getDriver(world, r.driverId)?.name ?? r.driverId}</button></td>
    <td>${teamChip(getTeam(world, r.teamId))}</td>
    <td>P${r.grid ?? "—"}</td>
    <td class="${r.retired ? "bad" : ""}">${r.retired ? (r.cause ?? "Retirado") : r.position === 1 ? formatRaceTime(safe(r.time)) : `+${safe(r.gap).toFixed(3)}s`}</td>
    <td>${r.pits ?? 0}</td>
    <td><strong>${r.points ?? 0}</strong></td>
  </tr>`).join("")}</tbody></table></div>
  <div class="grid two">
    <article class="card"><h3>Estrategias</h3>${results.map(r => `<div class="standing-line"><b>${getDriver(world, r.driverId)?.name ?? r.driverId}</b><span>${(r.tyresUsed ?? []).join(" → ") || "Sin datos"}</span><strong>${r.pits ?? 0} parada(s)</strong></div>`).join("")}</article>
    <article class="card"><h3>Incidentes y control de carrera</h3>${incidents.length ? incidents.map(e => `<div class="standing-line"><b>${e.segment ?? "Carrera"}</b><span>${e.description ?? e.message ?? e.type ?? "Incidente"}</span><strong>${e.severity ?? ""}</strong></div>`).join("") : `<p class="muted">Sin incidentes relevantes guardados.</p>`}</article>
  </div>`;
}

function renderNextRace(world, data, category, state, complete) {
  const next = data.circuits.find(c => c.id === category.calendar[state.currentRound - 1]);
  if (complete) return emptyState("Calendario completado", "Seleccioná una carrera anterior para consultar el resultado guardado o cerrá la temporada cuando todas las categorías estén listas.");
  if (!next) return emptyState("Sin próxima carrera", "El calendario no tiene una ronda pendiente para esta categoría.");
  return `<article class="circuit-preview pre-race-card">
    <div class="circuit-number">R${state.currentRound}</div>
    <div><span class="kicker">${next.countryCode} · ${next.location} · ${fakeDate(world.currentSeason, state.currentRound)}</span><h2>${next.name}</h2><p>${next.type} · ${next.corners} curvas · velocidad media ${next.averageSpeed}/100</p>${circuitFacts(next)}</div>
  </article>${emptyState("La parrilla está lista", "El motor ponderará clasificación, motor, aero, neumáticos, clima y riesgo de Safety Car. Si querés más control, corré la ronda desde Race Weekend.")}`;
}

export function renderRaceScreen(world, data, selectedRound = "latest", ui = {}) {
  const category = getCategory(world);
  const state = getCategoryState(world);
  const complete = state.currentRound > category.calendar.length;
  const completed = (world.raceResults ?? []).filter(r => r.categoryId === category.id && r.season === world.currentSeason).sort((a, b) => a.round - b.round);
  const selected = resultBySelection(completed, selectedRound);
  const postRace = ui.postRaceResult?.race ? ui.postRaceResult : null;
  const focusedResult = postRace?.race ?? selected;
  const processing = ui.processing?.type?.includes("race") || ui.processing?.type === "season" ? ui.processing : null;
  const heading = postRace ? `Resultado de carrera · R${postRace.race.round}` : selected ? `Carrera completada · R${selected.round}` : complete ? "Calendario completado" : "Próxima carrera";
  let html = pageHead(heading, `${category.name} · resultado, consecuencia y siguiente acción`, controls(world, category, state, selectedRound, completed, complete, Boolean(processing)));
  html += processingPanel(processing);
  html += ui.seasonSummary ? renderSeasonSummary(world, data, ui.seasonSummary.races) : "";
  if (focusedResult && !processing) return html + renderStoredRace(world, data, focusedResult, postRace?.preSnapshot, Boolean(postRace));
  return html + renderNextRace(world, data, category, state, complete);
}

export { renderPostRaceSummary };
