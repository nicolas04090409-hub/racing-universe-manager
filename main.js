import { APP_NAME, APP_VERSION, BUILD_LABEL } from "./appMeta.js";
import { createWorld, currentCategory, finishSeason, simulateGlobalWeekend, simulateNextRace, simulateRemainingSeason } from "./engine/worldEngine.js";
import { releasePlayerDriver, renewPlayerDriver } from "./engine/contractEngine.js";
import { startDevelopmentProject, startFacilityProject } from "./engine/developmentEngine.js";
import { createPlayerOffer, finalizeAcceptedNegotiation, withdrawNegotiation } from "./engine/negotiationEngine.js";
import { applyWeekendSetup, initializeRaceWeekend, runPracticeSession, runQualifyingSession, runRaceSession, finalizeRaceWeekend } from "./engine/raceWeekendEngine.js";
import { acceptManagerOffer, rejectManagerOffer } from "./engine/managerCareerEngine.js";
import { syncTeamsAndDrivers } from "./engine/syncEngine.js";
import { applyTeamThemeToDocument } from "./engine/teamThemeEngine.js";
import { sendSponsorProposal } from "./engine/sponsorEngine.js";
import { deleteSave, hasSave, loadGame, saveGame, saveRequiresNewGame } from "./save/saveManager.js";
import { renderDashboard } from "./ui/dashboard.js";
import { renderTeamScreen } from "./ui/teamScreen.js";
import { renderDriverScreen } from "./ui/driverScreen.js";
import { offerModal, renderMarketScreen } from "./ui/marketScreen.js";
import { renderNegotiationsScreen } from "./ui/negotiationsScreen.js";
import { renderCalendarScreen } from "./ui/calendarScreen.js";
import { renderRaceScreen } from "./ui/raceScreen.js";
import { renderStandingsScreen } from "./ui/standingsScreen.js";
import { renderDevelopmentScreen } from "./ui/developmentScreen.js";
import { renderSaveScreen } from "./ui/saveScreen.js";
import { renderFacilitiesScreen } from "./ui/facilitiesScreen.js";
import { renderFinanceScreen } from "./ui/financeScreen.js";
import { renderNewsScreen } from "./ui/newsScreen.js";
import { renderRegulationsScreen } from "./ui/regulationsScreen.js";
import { renderSettingsScreen } from "./ui/settingsScreen.js";
import { renderOffersScreen } from "./ui/offersScreen.js";
import { renderStaffScreen } from "./ui/staffScreen.js";
import { renderSponsorsScreen } from "./ui/sponsorsScreen.js";
import { renderGlobalHud } from "./ui/globalHud.js";
import { renderRaceWeekendScreen } from "./ui/raceWeekendScreen.js";
import { renderHistoryScreen } from "./ui/historyScreen.js";

const SAVE_KEY = "racingUniverseManager.save.v1";
const NAVIGATION = [
  { section: "GENERAL", items: [["dashboard", "⌂", "Paddock"], ["team", "▰", "Mi equipo"], ["drivers", "♟", "Pilotos"], ["market", "⇄", "Mercado"], ["negotiations", "✍", "Negociaciones"]] },
  { section: "COMPETICIÓN", items: [["race-weekend", "▣", "Race Weekend"], ["calendar", "◇", "Calendario"], ["race", "⚑", "Carreras"], ["standings", "≡", "Posiciones"], ["history", "▷", "Historial"]] },
  { section: "CARRERA", items: [["offers", "★", "Ofertas del manager"], ["staff", "⚙", "Staff"], ["development", "⌁", "Ingeniería"], ["facilities", "⌂", "Instalaciones"], ["finances", "$", "Finanzas"], ["sponsors", "●", "Sponsors"], ["news", "◎", "Noticias"], ["regulations", "§", "Reglamentos"]] },
  { section: "SISTEMA", items: [["settings", "⚙", "Configuración"], ["save", "◆", "Guardar / Cargar"]] }
];
const MOBILE_PRIMARY = [["dashboard", "Inicio", "⌂"], ["team", "Equipo", "▰"], ["race-weekend", "Carrera", "▣"], ["market", "Mercado", "⇄"], ["more", "Más", "⋯"]];
const MOBILE_MORE = [["drivers", "Pilotos"], ["calendar", "Calendario"], ["race", "Carreras"], ["standings", "Posiciones"], ["development", "Ingeniería"], ["facilities", "Instalaciones"], ["staff", "Staff"], ["sponsors", "Sponsors"], ["finances", "Finanzas"], ["news", "Noticias"], ["history", "Historial"], ["settings", "Configuración"], ["save", "Guardar partida"]];
const TITLES = { dashboard: "Paddock", team: "Mi equipo", drivers: "Pilotos", market: "Scouting y mercado", negotiations: "Negociaciones", "race-weekend": "Race Weekend", calendar: "Calendario", race: "Carreras navegables", standings: "Posiciones", history: "Historial", offers: "Ofertas del manager", staff: "Staff", development: "Ingeniería", facilities: "Instalaciones", finances: "Finanzas", sponsors: "Sponsors", news: "Noticias", regulations: "Reglamentos", settings: "Configuración", save: "Guardar / Cargar" };
const state = { data: null, world: null, screen: "dashboard", selectedDriverId: null, standingsMode: "drivers", standingsScope: "top", raceRound: "latest", mobileMoreOpen: false, selectedMobileHudGroup: localStorage.getItem("rumMobileHudGroup") || "team", historyFilters: { mode: "universe", category: "current", season: "all", tab: "summary" }, marketFilters: { category: "all", academy: "all", potential: "all", ca: "all", age: "all", contract: "all" }, newsFilters: { type: "all", category: "all", priority: "all" } };
const screen = document.querySelector("#screen");
const modalRoot = document.querySelector("#modal-root");
const loadingScreen = document.querySelector("#loading-screen");

console.info(`${APP_NAME} — ${BUILD_LABEL}`);
const loadingVersion = document.querySelector("#loading-version");
if (loadingVersion) loadingVersion.textContent = BUILD_LABEL;

function hideLoading() {
  loadingScreen?.classList.add("hidden");
  setTimeout(() => loadingScreen?.remove(), 250);
}

async function loadData() {
  const files = ["categories", "teams", "drivers", "circuits", "regulations", "academies", "staff", "manufacturers", "sponsors", "historicalChampions"];
  const entries = await Promise.all(files.map(async name => {
    const response = await fetch(`./data/${name}.json?v=${APP_VERSION}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} al cargar ${name}.json`);
    return [name, await response.json()];
  }));
  return Object.fromEntries(entries);
}

function readSavedSummary() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (!raw || !state.data) return null;
    const team = state.data.teams.find(t => t.id === raw.userTeamId) || raw.teams?.find(t => t.id === raw.userTeamId);
    const category = state.data.categories.find(c => c.id === (team?.categoryId ?? raw.currentCategoryId));
    const catState = raw.categoryStates?.[category?.id];
    return { team, category, season: raw.currentSeason ?? 2026, round: catState?.currentRound ?? 1, total: category?.calendar?.length ?? 0, saveVersion: raw.saveVersion, updatedAt: raw.updatedAt };
  } catch { return null; }
}

function pendingCount(id) {
  if (!state.world) return 0;
  if (id === "offers") return state.world.managerOffers?.filter(o => o.status === "pending").length ?? 0;
  if (id === "negotiations") return state.world.negotiations?.filter(n => ["sent", "counter", "accepted", "waiting"].includes(n.status) && n.type === "player").length ?? 0;
  return 0;
}

function renderNav() {
  document.querySelector("#main-nav").innerHTML = NAVIGATION.map(group => `<div class="nav-group"><span class="nav-section">${group.section}</span>${group.items.map(([id, icon, label]) => {
    const count = pendingCount(id);
    return `<button type="button" class="nav-button ${state.screen === id ? "active" : ""}" data-action="go" data-screen="${id}" ${!state.world ? "disabled" : ""}><span class="nav-icon">${icon}</span>${label}${count ? `<b class="nav-count">${count}</b>` : ""}</button>`;
  }).join("")}</div>`).join("");
}

function renderMobileNav() {
  const nav = document.querySelector("#mobile-nav");
  const panel = document.querySelector("#mobile-more-panel");
  if (!nav || !panel) return;
  document.body.classList.toggle("has-world", Boolean(state.world));
  nav.innerHTML = MOBILE_PRIMARY.map(([id, label, icon]) => `<button type="button" class="${(state.screen === id || id === "more" && state.mobileMoreOpen) ? "active" : ""}" data-action="${id === "more" ? "toggle-mobile-more" : "go"}" ${id !== "more" ? `data-screen="${id}"` : ""} ${!state.world && id !== "more" ? "disabled" : ""}><span>${icon}</span><strong>${label}</strong></button>`).join("");
  panel.classList.toggle("open", state.mobileMoreOpen);
  panel.setAttribute("aria-hidden", state.mobileMoreOpen ? "false" : "true");
  panel.innerHTML = `<div class="mobile-more-card" role="dialog" aria-label="Más secciones"><div class="mobile-more-head"><strong>Más secciones</strong><button type="button" class="close" data-action="toggle-mobile-more" aria-label="Cerrar menú">×</button></div><div class="mobile-more-grid">${MOBILE_MORE.map(([id, label]) => `<button type="button" class="${state.screen === id ? "active" : ""}" data-action="go" data-screen="${id}" ${!state.world ? "disabled" : ""}>${label}</button>`).join("")}</div></div>`;
}

function welcome() {
  const saved = readSavedSummary();
  const primary = saved ? "continue-game" : "new-game";
  const updated = saved?.updatedAt ? new Date(saved.updatedAt).toLocaleString("es-AR") : "Sin registro";
  return `<section class="mobile-home hero app-home release-home">
    <div class="release-version">${BUILD_LABEL}</div>
    <div class="app-home-brand"><span class="brand-mark big">R</span><div><h2>${APP_NAME}</h2><p>Gestioná tu universo de motorsport desde el Paddock.</p></div></div>
    ${saved ? `<article class="card continue-card"><span class="metric-label">CONTINUAR PARTIDA</span><h3>${saved.team?.name ?? "Equipo"}</h3><p>${saved.category?.name ?? "Categoría"}<br>Temporada ${saved.season} · Ronda ${Math.min(saved.round, saved.total || saved.round)}/${saved.total || "?"}<br><small>Última vez jugada: ${updated}</small></p><button type="button" id="continue-button" class="button primary touch-primary" data-action="continue-game">Continuar partida</button></article>` : `<article class="card continue-card"><span class="metric-label">SIN GUARDADO</span><h3>No hay partidas guardadas todavía.</h3><p>Creá una nueva partida para elegir equipo y empezar en el Paddock.</p></article>`}
    <div class="home-actions">
      <button type="button" id="new-game-button" class="button ${primary === "new-game" ? "primary" : ""} touch-primary" data-action="new-game">Nueva partida</button>
      <button type="button" class="button" data-action="load" ${hasSave() ? "" : "disabled"}>Cargar partida</button>
      <button type="button" class="button ghost" data-action="go-settings-from-home">Opciones</button>
    </div>
  </section>`;
}

function bindWelcomeActions() {
  const newButton = document.querySelector("#new-game-button");
  if (newButton) newButton.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); chooseTeam(); }, { once: true });
  const continueButton = document.querySelector("#continue-button");
  if (continueButton) continueButton.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); continueSave(); }, { once: true });
}

function render() {
  renderNav();
  renderMobileNav();
  document.querySelector("#page-title").textContent = state.world ? TITLES[state.screen] : APP_NAME;
  const view = state.world?.categories.find(c => c.id === (state.world.viewCategoryId ?? state.world.currentCategoryId));
  const team = state.world?.teams.find(t => t.id === state.world.userTeamId);
  const playerCategory = state.world ? currentCategory(state.world) : null;
  const categoryState = state.world && playerCategory ? state.world.categoryStates[playerCategory.id] : null;
  if (team) applyTeamThemeToDocument(team);
  document.querySelector("#eyebrow").textContent = view?.name ?? "UNIVERSO DEL MOTORSPORT";
  document.querySelector("#mobile-summary").textContent = state.world ? `${team?.shortName} · ${playerCategory?.shortName} · Temp. ${state.world.currentSeason} · R${Math.min(categoryState?.currentRound ?? 1, playerCategory?.calendar.length ?? 1)}/${playerCategory?.calendar.length ?? 1}` : BUILD_LABEL;
  document.querySelector("#save-status").textContent = state.world ? `${team?.shortName} · ${playerCategory?.shortName}` : BUILD_LABEL;
  document.querySelector("#game-meta").innerHTML = state.world ? `<label class="category-picker"><span>VISTA DEL UNIVERSO</span><select id="category-selector">${state.world.categories.map(c => `<option value="${c.id}" ${c.id === view.id ? "selected" : ""}>${c.name}</option>`).join("")}</select></label><strong>${worldVersionLabel()}</strong>` : "";
  document.querySelector(".topbar-tools").classList.toggle("hidden", !state.world);
  document.querySelector("#global-hud").innerHTML = state.world ? renderGlobalHud(state.world, state.data, state.selectedMobileHudGroup) : "";
  if (!state.world) { screen.innerHTML = welcome(); bindWelcomeActions(); return; }
  const renderers = { dashboard: () => renderDashboard(state.world, state.data), team: () => renderTeamScreen(state.world), drivers: () => renderDriverScreen(state.world, state.data, state.selectedDriverId), market: () => renderMarketScreen(state.world, state.data, state.marketFilters), negotiations: () => renderNegotiationsScreen(state.world), "race-weekend": () => renderRaceWeekendScreen(state.world, state.data), calendar: () => renderCalendarScreen(state.world, state.data), race: () => renderRaceScreen(state.world, state.data, state.raceRound), standings: () => renderStandingsScreen(state.world, state.standingsMode, state.standingsScope), history: () => renderHistoryScreen(state.world, state.data, state.historyFilters), offers: () => renderOffersScreen(state.world), staff: () => renderStaffScreen(state.world), development: () => renderDevelopmentScreen(state.world, state.data), facilities: () => renderFacilitiesScreen(state.world), finances: () => renderFinanceScreen(state.world, state.data), sponsors: () => renderSponsorsScreen(state.world), news: () => renderNewsScreen(state.world, state.newsFilters), regulations: () => renderRegulationsScreen(state.world, state.data), settings: () => renderSettingsScreen(state.world), save: () => renderSaveScreen(state.world) };
  screen.innerHTML = (renderers[state.screen] ?? renderers.dashboard)();
}

function worldVersionLabel() {
  return state.world?.currentSeason ? String(state.world.currentSeason) : BUILD_LABEL;
}

function chooseTeam() {
  state.mobileMoreOpen = false;
  renderMobileNav();
  modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="metric-label accent">NUEVA PARTIDA · ${BUILD_LABEL}</div><h2>Elegí equipo y categoría</h2><p class="muted">La partida abrirá en el Paddock Hub.</p></div><button type="button" class="close" data-action="close-modal" aria-label="Cerrar">×</button></div>${state.data.categories.map(category => `<h3>${category.name} <small class="muted">· ${category.realEquivalent}</small></h3><div class="team-picker">${state.data.teams.filter(t => t.categoryId === category.id).map(team => `<button type="button" class="team-option" style="--team-color:${team.color}" data-action="select-team" data-team="${team.id}"><strong>${team.name}</strong><span>Auto ${team.carPerformance} · Reputación ${team.reputation} · $${(team.budget / 1e6).toFixed(1)}M · ${team.teamPhilosophy ?? "balanced"}</span></button>`).join("")}</div>`).join("")}</div></div>`;
}

function toast(message, type = "") {
  const element = document.createElement("div");
  element.className = `toast ${type}`;
  element.textContent = message;
  document.querySelector("#toast-root").append(element);
  setTimeout(() => element.remove(), 3500);
}

function persist(message = "Partida guardada.") {
  syncTeamsAndDrivers(state.world);
  saveGame(state.world);
  toast(message, "good");
}

function continueSave() {
  if (saveRequiresNewGame()) { toast("El guardado es demasiado antiguo: iniciá una nueva partida."); chooseTeam(); return; }
  const loaded = loadGame(state.data);
  if (!loaded) return toast("No hay una partida válida para cargar.");
  state.world = loaded;
  state.screen = "dashboard";
  state.mobileMoreOpen = false;
  state.selectedMobileHudGroup = loaded.selectedMobileHudGroup ?? state.selectedMobileHudGroup;
  toast("Partida cargada correctamente.", "good");
  render();
}

function readOfferForm() { return { salary: Number(document.querySelector("#offer-salary")?.value ?? 0), duration: Number(document.querySelector("#offer-duration")?.value ?? 2), role: document.querySelector("#offer-role")?.value ?? "second_driver", signingBonus: Number(document.querySelector("#offer-bonus")?.value ?? 0), releaseClause: Number(document.querySelector("#offer-clause")?.value ?? 0), optionYears: Number(document.querySelector("#offer-option")?.value ?? 0) }; }
function readWeekendSetup() { return { setup: { aeroLevel: document.querySelector("#rw-aero")?.value ?? "medium", suspension: document.querySelector("#rw-suspension")?.value ?? "balanced", brakeBias: document.querySelector("#rw-brakes")?.value ?? "balanced", engineMode: document.querySelector("#rw-engine")?.value ?? "normal" }, program: document.querySelector("#rw-program")?.value ?? "balance", risk: document.querySelector("#rw-risk")?.value ?? "medium", racePlan: { default: { startTyre: document.querySelector("#rw-start-tyre")?.value ?? "medium", pace: document.querySelector("#rw-pace")?.value ?? "balanced", mode: document.querySelector("#rw-plan")?.value ?? "attack" } } }; }

document.addEventListener("change", event => {
  if (event.target.id === "category-selector" && state.world) { state.world.viewCategoryId = event.target.value; state.selectedDriverId = null; state.raceRound = "latest"; state.historyFilters.category = "current"; render(); }
  if (event.target.dataset.raceRound) { state.raceRound = event.target.value; render(); }
  if (event.target.dataset.mobileHudGroup) { state.selectedMobileHudGroup = event.target.value; localStorage.setItem("rumMobileHudGroup", state.selectedMobileHudGroup); if (state.world) state.world.selectedMobileHudGroup = state.selectedMobileHudGroup; render(); }
  if (event.target.dataset.historyFilter) { state.historyFilters[event.target.dataset.historyFilter] = event.target.value; render(); }
  if (event.target.dataset.marketFilter) { state.marketFilters[event.target.dataset.marketFilter] = event.target.value; render(); }
  if (event.target.dataset.newsFilter) { state.newsFilters[event.target.dataset.newsFilter] = event.target.value; render(); }
});

document.addEventListener("click", event => {
  if (event.target.id === "mobile-more-panel" && state.mobileMoreOpen) { state.mobileMoreOpen = false; renderMobileNav(); return; }
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "retry-load") { window.location.reload(); return; }
  if (action === "toggle-error-details") { document.querySelector("#error-details")?.classList.toggle("hidden"); return; }
  if (action === "go-settings-from-home") { toast("Creá o cargá una partida para abrir Configuración."); return; }
  if (action === "toggle-mobile-more") { state.mobileMoreOpen = !state.mobileMoreOpen; renderMobileNav(); return; }
  if (action === "go" && state.world) { state.screen = button.dataset.screen; state.selectedDriverId = null; state.mobileMoreOpen = false; document.querySelector("#app").classList.remove("menu-open"); render(); return; }
  if (action === "new-game") { chooseTeam(); return; }
  if (action === "continue-game" || action === "load") { continueSave(); return; }
  if (action === "close-modal") { modalRoot.innerHTML = ""; return; }
  if (action === "select-team") { state.world = createWorld(state.data, button.dataset.team); state.screen = "dashboard"; state.selectedMobileHudGroup = "team"; state.world.selectedMobileHudGroup = "team"; modalRoot.innerHTML = ""; persist("Partida creada."); render(); return; }
  if (action === "save" && state.world) { persist("Partida guardada."); return; }
  if (action === "delete-save" && confirm("¿Borrar definitivamente la partida guardada?")) { deleteSave(); toast("Slot borrado."); render(); return; }
  if (action === "simulate-race") { const race = simulateNextRace(state.world, state.data); if (race) { state.world.viewCategoryId = state.world.currentCategoryId; state.raceRound = String(race.round); persist(`Ronda ${race.round} simulada.`); render(); } return; }
  if (action === "simulate-world") { const races = simulateGlobalWeekend(state.world, state.data); persist(`${races.length} categorías avanzaron este fin de semana.`); render(); return; }
  if (action === "simulate-season") { if (!confirm("Se simularán todas las carreras pendientes de todas las categorías. ¿Continuar?")) return; const races = simulateRemainingSeason(state.world, state.data); persist(`${races.length} carreras simuladas. Universo listo para cerrar.`); render(); return; }
  if (action === "finish-season") { const result = finishSeason(state.world, state.data); toast(result.message, result.ok ? "good" : ""); if (result.ok) { state.screen = "negotiations"; persist("Nueva temporada creada."); } render(); return; }
  if (action === "start-weekend") { initializeRaceWeekend(state.world, state.world.currentCategoryId); state.screen = "race-weekend"; persist("Race Weekend iniciado."); render(); return; }
  if (action === "apply-weekend-setup") { const result = applyWeekendSetup(state.world, readWeekendSetup()); toast(result.message, result.ok ? "good" : ""); if (result.ok) persist("Setup actualizado."); render(); return; }
  if (action === "run-practice") { applyWeekendSetup(state.world, readWeekendSetup()); runPracticeSession(state.world); persist("Práctica completada."); render(); return; }
  if (action === "run-qualifying") { runQualifyingSession(state.world); persist("Clasificación completada."); render(); return; }
  if (action === "run-weekend-race") { runRaceSession(state.world); persist("Carrera por segmentos completada."); render(); return; }
  if (action === "finalize-weekend") { const result = finalizeRaceWeekend(state.world, state.data); toast(result.message, result.ok ? "good" : ""); if (result.ok) { state.raceRound = String(result.race.round); persist("Race Weekend finalizado."); } render(); return; }
  if (action === "open-offer") { modalRoot.innerHTML = offerModal(state.world, button.dataset.driver); return; }
  if (action === "send-offer") { const result = createPlayerOffer(state.world, button.dataset.driver, readOfferForm()); toast(result.message, result.ok ? "good" : ""); if (result.ok) { modalRoot.innerHTML = ""; state.screen = "negotiations"; persist("Oferta enviada."); render(); } return; }
  if (action === "finalize-offer") { const result = finalizeAcceptedNegotiation(state.world, button.dataset.negotiation); toast(result.message, result.ok ? "good" : ""); if (result.ok) persist("Contrato firmado."); render(); return; }
  if (action === "withdraw-offer") { const result = withdrawNegotiation(state.world, button.dataset.negotiation); toast(result.message, result.ok ? "good" : ""); if (result.ok) persist("Oferta retirada."); render(); return; }
  if (action === "improve-offer") { const negotiation = state.world.negotiations.find(n => n.id === button.dataset.negotiation); if (negotiation) { negotiation.status = "sent"; negotiation.history.push({ status: "sent", message: "Contraoferta aceptada por el equipo." }); persist("Contraoferta enviada."); render(); } return; }
  if (action === "start-development") { const result = startDevelopmentProject(state.world, state.world.userTeamId, button.dataset.component); toast(result.message, result.ok ? "good" : ""); if (result.ok) { persist("Proyecto iniciado."); render(); } return; }
  if (action === "start-facility") { const result = startFacilityProject(state.world, state.world.userTeamId, button.dataset.facility); toast(result.message, result.ok ? "good" : ""); if (result.ok) { persist("Obra iniciada."); render(); } return; }
  if (action === "send-sponsor-proposal") { const result = sendSponsorProposal(state.world, button.dataset.sponsor); toast(result.message, result.ok ? "good" : ""); if (result.ok) persist("Sponsor firmado."); render(); return; }
  if (action === "renew-driver") { const result = renewPlayerDriver(state.world, button.dataset.driver); toast(result.message, result.ok ? "good" : ""); if (result.ok) { persist(); render(); } return; }
  if (action === "release-driver") { const result = releasePlayerDriver(state.world, button.dataset.driver); toast(result.message, result.ok ? "good" : ""); if (result.ok) { persist(); render(); } return; }
  if (action === "view-driver") { state.selectedDriverId = button.dataset.driver; state.screen = "drivers"; state.mobileMoreOpen = false; render(); return; }
  if (action === "close-driver") { state.selectedDriverId = null; render(); return; }
  if (action === "standings-mode") { state.standingsMode = button.dataset.filter; render(); return; }
  if (action === "standings-scope") { state.standingsScope = button.dataset.filter; render(); return; }
  if (action === "history-tab") { state.historyFilters.tab = button.dataset.tab; render(); return; }
  if (action === "accept-offer") { const result = acceptManagerOffer(state.world, button.dataset.offer); toast(result.message, result.ok ? "good" : ""); if (result.ok) { state.screen = "dashboard"; persist(); } render(); return; }
  if (action === "reject-offer") { const result = rejectManagerOffer(state.world, button.dataset.offer); toast(result.message); persist(); render(); }
});

document.querySelector("#menu-toggle").addEventListener("click", () => {
  if (matchMedia("(max-width: 768px)").matches) {
    state.mobileMoreOpen = true;
    renderMobileNav();
  } else {
    document.querySelector("#app").classList.toggle("menu-open");
  }
});

document.querySelector("#global-search").addEventListener("keydown", event => {
  if (event.key !== "Enter" || !state.world) return;
  const query = event.target.value.trim().toLowerCase();
  const driver = state.world.drivers.find(d => d.name.toLowerCase().includes(query));
  if (driver) { state.selectedDriverId = driver.id; state.world.viewCategoryId = driver.categoryId ?? state.world.currentCategoryId; state.screen = "drivers"; render(); }
  else toast("No se encontró un piloto con ese nombre.");
});

async function boot() {
  try {
    state.data = await loadData();
    hideLoading();
    render();
  } catch (error) {
    hideLoading();
    console.error("Data load failed", error);
    screen.innerHTML = `<div class="empty card load-error"><div><h2>No se pudieron cargar los datos del juego.</h2><p>Revisá la conexión o volvé a intentar. Si estás en GitHub Pages, esperá unos segundos y recargá sin caché.</p><div class="actions"><button class="button primary" data-action="retry-load">Reintentar</button><button class="button" data-action="toggle-error-details">Ver detalles técnicos</button></div><pre id="error-details" class="hidden">${String(error.stack ?? error.message ?? error)}</pre></div></div>`;
  }
}

boot();
