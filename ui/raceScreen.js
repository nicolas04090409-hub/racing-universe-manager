import { formatRaceTime } from "../engine/raceEngine.js";
import { allCategoriesComplete } from "../engine/worldEngine.js";
import { fakeDate, getCategory, getCategoryState, getDriver, getTeam, pageHead, teamChip } from "./helpers.js";
import { emptyState } from "./components.js";

const safe = value => Number.isFinite(Number(value)) ? Number(value) : 0;

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

function controls(world, category, state, selectedRound, completed, complete) {
  const playerView = category.id === world.currentCategoryId;
  const allDone = allCategoriesComplete(world);
  const disabledSingle = !playerView || complete;
  return `<div class="race-mobile-actions card">
    <h3>Centro de carrera</h3>
    ${roundSelect(world, completed, selectedRound)}
    <div class="mobile-action-grid">
      <button class="button primary" data-action="simulate-race" ${disabledSingle ? "disabled" : ""} title="${!playerView ? "Solo podés simular tu categoría activa" : complete ? "Calendario completado" : "Simular próxima carrera"}">Simular próxima carrera</button>
      <button class="button" data-action="start-weekend" ${disabledSingle ? "disabled" : ""}>Ir al Race Weekend</button>
      <button class="button" data-action="simulate-world" ${allDone ? "disabled" : ""}>Simular fin de semana global</button>
      <button class="button danger" data-action="simulate-season" ${allDone ? "disabled" : ""}>Simular temporada global</button>
      <button class="button good" data-action="finish-season" ${!allDone ? "disabled" : ""}>Cerrar temporada</button>
    </div>
    <p class="muted">La simulación de temporada avanza todas las categorías hasta el final. Race Weekend te da control manual sobre prácticas, setup, clasificación y carrera.</p>
  </div>
  <div class="actions race-toolbar">
    ${roundSelect(world, completed, selectedRound)}
    <button class="button primary" data-action="simulate-race" ${disabledSingle ? "disabled" : ""} title="${!playerView ? "Solo podés simular tu categoría activa" : complete ? "Calendario completado" : "Simular próxima carrera"}">Simular próxima carrera</button>
    <button class="button" data-action="start-weekend" ${disabledSingle ? "disabled" : ""}>Race Weekend</button>
    <button class="button" data-action="simulate-world" ${allDone ? "disabled" : ""}>Simular fin de semana global</button>
    <button class="button danger" data-action="simulate-season" ${allDone ? "disabled" : ""}>Simular temporada global</button>
    <button class="button good" data-action="finish-season" ${!allDone ? "disabled" : ""} title="${!allDone ? "Deben terminar todas las categorías" : "Cerrar temporada y archivar"}">Cerrar temporada</button>
  </div>`;
}

function renderStoredRace(world, data, result) {
  const circuit = data.circuits.find(c => c.id === result.circuitId);
  const results = result.results ?? [];
  const top = results.slice(0, 3);
  const incidents = (result.events ?? []).slice(0, 5);
  return `${pageHead(`Resultado guardado: ${circuit?.name ?? result.circuitId}`, `${result.weather ?? "Clima variable"}${result.safetyCar ? " · Safety Car" : ""} · Ronda ${result.round} · ${result.raceWeekend ? "Race Weekend" : "Simulación rápida"}`)}
  ${circuitFacts(circuit)}
  <article class="card notice"><strong>Resultado almacenado</strong><p>Esta vista lee la carrera ya guardada en el historial del save. No vuelve a simular ni altera puntos, posiciones o eventos.</p></article>
  <div class="race-podium">${[top[1], top[0], top[2]].map((r, i) => r ? `<div class="podium-step ${i === 1 ? "first" : i === 0 ? "second" : "third"}"><span class="pos">${r.position}</span><strong>${getDriver(world, r.driverId)?.name ?? "Piloto"}</strong><small>${getTeam(world, r.teamId)?.shortName ?? "Equipo"}</small></div>` : "").join("")}</div>
  <div class="compact-ranking-list race-result-compact">${results.slice(0, 12).map(r => `<button class="compact-ranking-row as-button" data-action="view-driver" data-driver="${r.driverId}"><span class="rank">#${r.position}</span><span class="name">${getDriver(world, r.driverId)?.name ?? r.driverId}</span><small>${getTeam(world, r.teamId)?.shortName ?? "—"} · parrilla P${r.grid ?? "—"} · ${r.pits ?? 0} boxes</small><strong>${r.points ?? 0} pts</strong></button>`).join("")}</div>
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
    <article class="card"><h3>Estrategias</h3>${results.slice(0, 8).map(r => `<div class="standing-line"><b>${getDriver(world, r.driverId)?.name ?? r.driverId}</b><span>${(r.tyresUsed ?? []).join(" → ") || "Sin datos"}</span><strong>${r.pits ?? 0} parada(s)</strong></div>`).join("")}</article>
    <article class="card"><h3>Incidentes y control de carrera</h3>${incidents.length ? incidents.map(e => `<div class="standing-line"><b>${e.segment ?? "Carrera"}</b><span>${e.description ?? e.type ?? "Incidente"}</span><strong>${e.severity ?? ""}</strong></div>`).join("") : `<p class="muted">Sin incidentes relevantes guardados.</p>`}</article>
  </div>`;
}

function renderNextRace(world, data, category, state, complete) {
  const next = data.circuits.find(c => c.id === category.calendar[state.currentRound - 1]);
  if (complete) return emptyState("Calendario completado", "Seleccioná una carrera anterior para consultar el resultado guardado o cerrá la temporada cuando todas las categorías estén listas.");
  if (!next) return emptyState("Sin próxima carrera", "El calendario no tiene una ronda pendiente para esta categoría.");
  return `<article class="circuit-preview">
    <div class="circuit-number">R${state.currentRound}</div>
    <div><span class="kicker">${next.countryCode} · ${next.location} · ${fakeDate(world.currentSeason, state.currentRound)}</span><h2>${next.name}</h2><p>${next.type} · ${next.corners} curvas · velocidad media ${next.averageSpeed}/100</p>${circuitFacts(next)}</div>
  </article>${emptyState("La parrilla está lista", "El motor ponderará clasificación, motor, aero, neumáticos, clima y riesgo de Safety Car. Si querés más control, corré la ronda desde Race Weekend.")}`;
}

export function renderRaceScreen(world, data, selectedRound = "latest") {
  const category = getCategory(world);
  const state = getCategoryState(world);
  const complete = state.currentRound > category.calendar.length;
  const completed = (world.raceResults ?? []).filter(r => r.categoryId === category.id && r.season === world.currentSeason).sort((a, b) => a.round - b.round);
  const selected = resultBySelection(completed, selectedRound);
  const heading = selected ? `Carrera completada · R${selected.round}` : complete ? "Calendario completado" : "Próxima carrera";
  let html = pageHead(heading, `${category.name} · consultá resultados guardados o avanzá el calendario`, controls(world, category, state, selectedRound, completed, complete));
  html += `<article class="card helper"><h3>Qué estás viendo</h3><p>La pantalla separa carreras pendientes de resultados ya corridos. En mobile tenés las mismas acciones que en desktop: próxima carrera, Race Weekend, fin de semana global, temporada completa y cierre de temporada.</p></article>`;
  return html + (selected ? renderStoredRace(world, data, selected) : renderNextRace(world, data, category, state, complete));
}
