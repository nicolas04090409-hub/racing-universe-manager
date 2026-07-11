import { driverOverall, getCategory, getDriver, getTeam, money, pageHead, potentialBadge, potentialSummary, progress, scoutConfidence, teamChip } from "./helpers.js";
import { avatar, badge } from "./components.js";
import { contractStatus } from "../engine/contractEngine.js";

const labels = { speed: "Velocidad", qualifying: "Clasificación", racePace: "Ritmo de carrera", consistency: "Consistencia", overtaking: "Adelantamiento", defending: "Defensa", wetSkill: "Lluvia", tyreManagement: "Neumáticos", raceStarts: "Salidas", feedback: "Feedback", adaptability: "Adaptabilidad", pressure: "Presión", aggression: "Agresividad" };

function driverMobileCard(world,data,driver,team,contract,pot){
  return `<article class="card driver-mobile-card" style="--team-color:${team?.color??"#687384"}">
    <div class="driver-mobile-head">${avatar(driver,"large")}<div><span class="pill ${contract.tone}">${contract.label}</span><h3>${driver.countryCode??""} ${driver.name}</h3><p>${team?.shortName??"Libre"} · ${driver.age} años · #${driver.number??"—"}</p></div><strong>${driverOverall(driver)} CA</strong></div>
    <div class="mobile-stat-grid"><span>Potencial <b>${pot.rating}</b></span><span>Estado <b>${pot.label}</b></span><span>Moral <b>${driver.morale}</b></span><span>Fitness <b>${driver.fitness}</b></span></div>
    <p>Contrato: <strong>${driver.teamId?`hasta ${driver.contractUntil}`:"Libre"}</strong> · Valor <strong>${money(driver.marketValue??0)}</strong></p>
    <div class="actions"><button class="button primary" data-action="view-driver" data-driver="${driver.id}">Ver detalle</button><button class="button" data-action="open-offer" data-driver="${driver.id}">Negociar</button></div>
  </article>`;
}

function detail(world, data, driver) {
  const team = getTeam(world, driver.teamId), academy = data.academies.find(a => a.id === driver.academyId), contract = contractStatus(driver, world.currentSeason), confidence = scoutConfidence(driver, team), potential = potentialSummary(driver, team);
  const history = driver.careerHistory ?? [];
  return `<button class="text-button back" data-action="close-driver">← Volver a todos los pilotos</button>
  <section class="driver-detail-hero" style="--team-color:${team?.color ?? "#687384"}">${avatar(driver, "xl")}<div class="driver-identity">${badge(contract.label, contract.tone)}<h2>${driver.name}</h2><p>#${driver.number} · ${driver.countryCode} · ${driver.age} años · ${teamChip(team)}</p>${potentialBadge(driver, team)}</div><div class="overall-ring xl"><strong>${driverOverall(driver)}</strong><span>CA</span></div></section>
  <div class="grid four">${[["Valor", money(driver.marketValue)], ["Salario", money(driver.salary)], ["Reputación", driver.reputation], ["Fanbase", driver.fanbase?.global ?? driver.popularity ?? 50]].map(([l, v]) => `<article class="card"><div class="metric-label">${l}</div><div class="metric-value small">${v}</div></article>`).join("")}</div>
  <div class="grid two detail-columns">
    <article class="card"><div class="metric-label">ATRIBUTOS DEPORTIVOS · ESCALA 1–100</div><div class="attributes">${Object.entries(driver.attributes ?? {}).map(([key, value]) => progress(labels[key] ?? key, value, key === "wetSkill" ? "blue" : "")).join("")}</div></article>
    <div class="stack">
      <article class="card scouting-card"><div class="metric-label">INFORME DE SCOUTING · CONFIANZA ${confidence}%</div><h3>${driver.drivingStyle}</h3><p>${driver.scoutSummary}</p><div class="scout-meta"><span>${badge(driver.personality, "good")}</span><strong>${potential.rating} · ${potential.label}</strong></div><p>${potential.text}</p>${progress("Confianza informe", confidence, "blue")}<div class="trait-list">${(driver.traits ?? []).map(trait => badge(trait.replaceAll("_", " "))).join("")}</div></article>
      <article class="card"><div class="metric-label">ESTADO ACTUAL</div>${progress("Moral", driver.morale, "green")}${progress("Fitness", driver.fitness, "blue")}${progress("Experiencia", driver.experience)}</article>
      <article class="card"><div class="metric-label">CONTRATO / ACADEMIA</div><h3>${team?.name ?? "Agente libre"}</h3><p>Vigencia estimada hasta ${driver.contractUntil} · ${academy?.name ?? "Sin academia"}</p></article>
    </div>
  </div>
  ${pageHead("Historial de carrera", history.length ? `${history.length} temporada(s) registradas · ${history.reduce((a, b) => a + (b.wins ?? 0), 0)} victorias · ${history.reduce((a, b) => a + (b.podiums ?? 0), 0)} podios` : "Sin temporadas cerradas todavía")}
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Temporada</th><th>Categoría</th><th>Equipo</th><th>Pos</th><th>Puntos</th><th>Victorias</th><th>Podios</th></tr></thead><tbody>${history.map(h => `<tr><td>${h.season}</td><td>${world.categories.find(c => c.id === h.categoryId)?.shortName ?? h.categoryId}</td><td>${teamChip(getTeam(world, h.teamId))}</td><td>${h.position}</td><td>${h.points}</td><td>${h.wins}</td><td>${h.podiums}</td></tr>`).join("") || `<tr><td colspan="7" class="empty-cell">El historial se genera al cerrar temporadas.</td></tr>`}</tbody></table></div>`;
}

export function renderDriverScreen(world, data, selectedDriverId = null) {
  if (selectedDriverId) {
    const driver = getDriver(world, selectedDriverId);
    if (driver) return detail(world, data, driver);
  }
  const category = getCategory(world), sorted = [...world.drivers].filter(d => !d.retired && d.teamId && d.categoryId === category.id).sort((a, b) => driverOverall(b) - driverOverall(a));
  return `${pageHead("Base de pilotos", `${sorted.length} competidores · CA visible y potencial estimado por scouting`)}
  <div class="mobile-card-list driver-mobile-list">${sorted.slice(0,20).map(driver=>{const team=getTeam(world,driver.teamId),contract=contractStatus(driver,world.currentSeason),pot=potentialSummary(driver,team);return driverMobileCard(world,data,driver,team,contract,pot);}).join("")}<p class="notice">Mobile muestra los primeros 20 por rendimiento para evitar listas pesadas. Usá Mercado para filtrar más fino.</p></div>
  <div class="driver-directory">${sorted.map(driver => {
    const team = getTeam(world, driver.teamId), academy = data.academies.find(a => a.id === driver.academyId), contract = contractStatus(driver, world.currentSeason), pot = potentialSummary(driver, team);
    return `<button class="card directory-card" style="--team-color:${team?.color ?? "#687384"}" data-action="view-driver" data-driver="${driver.id}">${avatar(driver, "large")}<div class="directory-info"><span class="pill ${contract.tone}">${contract.label}</span><h3>${driver.name}</h3><p>${driver.countryCode} · ${driver.age} años · ${academy?.name ?? "Independiente"}</p><span>${teamChip(team)}</span></div><div class="directory-stats"><div><strong>${driverOverall(driver)}</strong><small>CA</small></div><div class="stars-cell"><strong>${pot.rating}</strong><small>${pot.label}</small></div><div><strong>${driver.reputation}</strong><small>REP.</small></div></div></button>`;
  }).join("")}</div>`;
}
