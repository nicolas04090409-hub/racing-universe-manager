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
import { renderGlobalHud, renderMobileHudGroup, VALID_MOBILE_HUD_GROUPS } from "./ui/globalHud.js";
import { renderRaceWeekendScreen } from "./ui/raceWeekendScreen.js";
import { renderHistoryScreen } from "./ui/historyScreen.js";

const SAVE_KEY = "racingUniverseManager.save.v1";
const DATA_BASE_URL = new URL("./data/", import.meta.url);
const DATA_FILES = ["categories", "teams", "drivers", "circuits", "regulations", "academies", "staff", "manufacturers", "sponsors", "historicalChampions"];
const NAVIGATION = [
  { section: "GENERAL", items: [["dashboard", "Paddock"], ["team", "Mi equipo"], ["drivers", "Pilotos"], ["market", "Mercado"], ["negotiations", "Negociaciones"]] },
  { section: "COMPETICIÓN", items: [["race-weekend", "Race Weekend"], ["calendar", "Calendario"], ["race", "Carreras"], ["standings", "Posiciones"], ["history", "Historial"]] },
  { section: "CARRERA", items: [["offers", "Ofertas del manager"], ["staff", "Staff"], ["development", "Ingeniería"], ["facilities", "Instalaciones"], ["finances", "Finanzas"], ["sponsors", "Sponsors"], ["news", "Noticias"], ["regulations", "Reglamentos"]] },
  { section: "SISTEMA", items: [["settings", "Configuración"], ["save", "Guardar / Cargar"]] }
];
const MOBILE_PRIMARY = [["dashboard", "Inicio"], ["team", "Equipo"], ["race-weekend", "Carrera"], ["market", "Mercado"], ["more", "Más"]];
const MOBILE_MORE = [["drivers", "Pilotos"], ["calendar", "Calendario"], ["race", "Carreras"], ["standings", "Posiciones"], ["development", "Ingeniería"], ["facilities", "Instalaciones"], ["staff", "Staff"], ["sponsors", "Sponsors"], ["finances", "Finanzas"], ["news", "Noticias"], ["history", "Historial"], ["settings", "Configuración"], ["save", "Guardar partida"]];
const TITLES = { dashboard: "Paddock", team: "Mi equipo", drivers: "Pilotos", market: "Scouting y mercado", negotiations: "Negociaciones", "race-weekend": "Race Weekend", calendar: "Calendario", race: "Carreras navegables", standings: "Posiciones", history: "Historial", offers: "Ofertas del manager", staff: "Staff", development: "Ingeniería", facilities: "Instalaciones", finances: "Finanzas", sponsors: "Sponsors", news: "Noticias", regulations: "Reglamentos", settings: "Configuración", save: "Guardar / Cargar" };
const state = { data: null, world: null, screen: "dashboard", selectedDriverId: null, standingsMode: "drivers", standingsScope: "top", raceRound: "latest", mobileMoreOpen: false, ui: { selectedMobileHudGroup: localStorage.getItem("rumMobileHudGroup") || "team", processing: null, postRaceResult: null, seasonSummary: null }, historyFilters: { mode: "universe", category: "current", season: "all", tab: "summary" }, marketFilters: { category: "all", academy: "all", potential: "all", ca: "all", age: "all", contract: "all" }, newsFilters: { type: "all", category: "all", priority: "all" } };
const screen = document.querySelector("#screen");
const modalRoot = document.querySelector("#modal-root");
const loadingScreen = document.querySelector("#loading-screen");

window.__RUM_BOOT_STARTED__ = true;
console.info(`${APP_NAME} — ${BUILD_LABEL}`);
const loadingVersion = document.querySelector("#loading-version");
if (loadingVersion) loadingVersion.textContent = BUILD_LABEL;

function setStartupMode(mode) {
  document.body.dataset.startup = mode;
  document.querySelector("#app")?.classList.toggle("startup-hidden", mode !== "ready");
}

function hideLoading() {
  loadingScreen?.classList.add("hidden");
  setTimeout(() => loadingScreen?.remove(), 250);
}

class StartupResourceError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "StartupResourceError";
    Object.assign(this, details);
  }
}

async function loadJson(name) {
  const url = new URL(`${name}.json?v=${APP_VERSION}`, DATA_BASE_URL);
  let response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (cause) {
    throw new StartupResourceError(`No se pudo solicitar ${name}.json`, { kind: "fetch", resource: `${name}.json`, url: url.href, cause });
  }
  if (!response.ok) {
    throw new StartupResourceError(`No se pudo cargar ${name}.json: HTTP ${response.status}`, { kind: "http", resource: `${name}.json`, url: url.href, status: response.status, statusText: response.statusText });
  }
  try {
    return await response.json();
  } catch (cause) {
    throw new StartupResourceError(`JSON inválido en ${name}.json`, { kind: "json", resource: `${name}.json`, url: url.href, cause });
  }
}

function startupErrorInfo(error) {
  if (window.location.protocol === "file:") {
    return {
      title: "El juego necesita un servidor local",
      message: "Abrí el juego mediante el launcher o un servidor HTTP. No lo abras con doble click en index.html."
    };
  }
  if (error?.kind === "http") {
    return {
      title: "No se pudieron cargar los datos del juego.",
      message: `El recurso ${error.resource ?? "requerido"} respondió HTTP ${error.status}. Revisá que GitHub Pages haya publicado todos los archivos y recargá sin caché.`
    };
  }
  if (error?.kind === "fetch") {
    return {
      title: "No se pudieron cargar los datos del juego.",
      message: "Falló una solicitud de recursos. Revisá la conexión, el despliegue de GitHub Pages o si el navegador bloqueó algún archivo."
    };
  }
  if (error?.kind === "json") {
    return {
      title: "No se pudieron leer los datos del juego.",
      message: "Un archivo JSON está dañado o GitHub Pages devolvió contenido inesperado. Abrí los detalles técnicos para ver cuál."
    };
  }
  return {
    title: "No se pudo cargar el juego.",
    message: "Hubo un problema al cargar los archivos de la aplicación. Revisá que la publicación haya terminado correctamente y recargá la página."
  };
}

function startupErrorDetails(error) {
  const lines = [
    `Mensaje: ${error?.message ?? error}`,
    `Tipo: ${error?.name ?? typeof error}`,
    `Kind: ${error?.kind ?? "unknown"}`,
    `URL actual: ${window.location.href}`,
    `Recurso: ${error?.resource ?? "n/a"}`,
    `URL solicitada: ${error?.url ?? "n/a"}`,
    `Status HTTP: ${error?.status ?? "n/a"} ${error?.statusText ?? ""}`.trim()
  ];
  const cause = error?.cause;
  if (cause) lines.push(`Causa: ${cause.message ?? cause}`);
  if (error?.stack) lines.push("", String(error.stack).split("\n").slice(0, 8).join("\n"));
  return lines.join("\n");
}

function showStartupError(error) {
  const info = startupErrorInfo(error);
  const details = startupErrorDetails(error);
  setStartupMode("error");
  console.error("Startup failed", error);
  if (typeof window.__RUM_SHOW_STARTUP_ERROR__ === "function") {
    window.__RUM_SHOW_STARTUP_ERROR__(info.title, info.message, details);
    return;
  }
  if (screen) {
    screen.innerHTML = `<div class="empty card load-error"><div><h2>${info.title}</h2><p>${info.message}</p><div class="actions"><button class="button primary" data-action="retry-load">Reintentar</button><button class="button" data-action="toggle-error-details">Ver detalles técnicos</button></div><pre id="error-details" class="hidden">${details}</pre></div></div>`;
  }
}

function warnPossibleEncodingIssue() {
  const debugEncoding = new URLSearchParams(window.location.search).has("debugEncoding") || localStorage.getItem("rumDebugEncoding") === "1";
  if (!debugEncoding) return;
  const text = document.body?.innerText ?? "";
  const corruptedPatterns = ["\u00c3\u0192", "\u00c3\u201a", "\u00c3\u00a2", "\u00c3\u00b0\u00c5\u0178", "\u00ef\u00bf\u00bd", "\ufffd"];
  const hit = corruptedPatterns.find(pattern => text.includes(pattern));
  if (hit) console.warn("Possible encoding issue detected:", hit, text.slice(Math.max(0, text.indexOf(hit) - 80), text.indexOf(hit) + 160));
}

async function loadData() {
  const entries = await Promise.all(DATA_FILES.map(async name => [name, await loadJson(name)]));
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

function navIcon(id) {
  const paths = {
    dashboard: '<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-5h-4v5H5a1 1 0 0 1-1-1z"/>',
    team: '<path d="M4 7h16v10H4z"/><path d="M8 7V5h8v2M8 17v2h8v-2"/>',
    drivers: '<circle cx="12" cy="8" r="3"/><path d="M5 20c1.5-4 12.5-4 14 0"/>',
    market: '<path d="M5 7h14M7 12h10M9 17h6"/><path d="m16 4 3 3-3 3M8 20l-3-3 3-3"/>',
    negotiations: '<path d="M5 8h9l5 5-6 6-5-5V8z"/><circle cx="9" cy="11" r="1"/>',
    "race-weekend": '<path d="M4 5h16v14H4z"/><path d="M8 5v14M16 5v14M4 10h16M4 15h16"/>',
    calendar: '<path d="M5 5h14v15H5z"/><path d="M8 3v4M16 3v4M5 10h14"/>',
    race: '<path d="M5 18V5h10l1 3h3v8h-4l-1-3H8v5z"/>',
    standings: '<path d="M6 18V9h4v9M10 18V5h4v13M14 18v-6h4v6"/>',
    history: '<path d="M5 12a7 7 0 1 0 2-5"/><path d="M5 5v5h5M12 8v5l3 2"/>',
    offers: '<path d="m12 4 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/>',
    staff: '<circle cx="9" cy="8" r="3"/><circle cx="16" cy="10" r="2.5"/><path d="M3 20c1-4 11-4 12 0M12 20c.8-3 7-3 8 0"/>',
    development: '<path d="M4 15 15 4l5 5L9 20H4z"/><path d="m13 6 5 5"/>',
    facilities: '<path d="M4 20V8l8-4 8 4v12"/><path d="M8 20v-7h8v7M8 10h8"/>',
    finances: '<path d="M12 3v18M17 7c-1-2-9-2-9 1 0 4 9 2 9 6 0 3-8 3-10 1"/>',
    sponsors: '<path d="M5 7h14v10H5z"/><path d="M8 11h8M8 14h5"/>',
    news: '<path d="M5 5h14v14H5z"/><path d="M8 9h8M8 12h8M8 15h5"/>',
    regulations: '<path d="M7 4h10v16H7z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    save: '<path d="M5 4h12l2 2v14H5z"/><path d="M8 4v6h8M8 20v-6h8"/>',
    more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'
  };
  return `<svg class="nav-svg" viewBox="0 0 24 24" aria-hidden="true">${paths[id] ?? paths.dashboard}</svg>`;
}

function renderNav() {
  document.querySelector("#main-nav").innerHTML = NAVIGATION.map(group => `<div class="nav-group"><span class="nav-section">${group.section}</span>${group.items.map(([id, label]) => {
    const count = pendingCount(id);
    return `<button type="button" class="nav-button ${state.screen === id ? "active" : ""}" data-action="go" data-screen="${id}" aria-label="Abrir ${label}" ${!state.world ? "disabled" : ""}><span class="nav-icon">${navIcon(id)}</span>${label}${count ? `<b class="nav-count">${count}</b>` : ""}</button>`;
  }).join("")}</div>`).join("");
}

function renderMobileNav() {
  const nav = document.querySelector("#mobile-nav");
  const panel = document.querySelector("#mobile-more-panel");
  if (!nav || !panel) return;
  document.body.classList.toggle("has-world", Boolean(state.world));
  nav.innerHTML = MOBILE_PRIMARY.map(([id, label]) => `<button type="button" class="${(state.screen === id || id === "more" && state.mobileMoreOpen) ? "active" : ""}" data-action="${id === "more" ? "toggle-mobile-more" : "go"}" ${id !== "more" ? `data-screen="${id}"` : ""} aria-label="${id === "more" ? "Abrir más secciones" : `Abrir ${label}`}" ${!state.world && id !== "more" ? "disabled" : ""}><span>${navIcon(id)}</span><strong>${label}</strong></button>`).join("");
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
    <div class="app-home-brand"><span class="brand-mark big">R</span><div><h2>${APP_NAME}</h2><p>GestionÃ¡ tu universo de motorsport desde el Paddock.</p></div></div>
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
  if (state.world) {
    state.world.ui ??= {};
    state.world.ui.selectedMobileHudGroup = state.ui.selectedMobileHudGroup;
  }
  document.querySelector("#global-hud").innerHTML = state.world ? renderGlobalHud(state.world, state.data, state.ui.selectedMobileHudGroup) : "";
  if (!state.world) { screen.innerHTML = welcome(); bindWelcomeActions(); return; }
  const renderers = { dashboard: () => renderDashboard(state.world, state.data), team: () => renderTeamScreen(state.world), drivers: () => renderDriverScreen(state.world, state.data, state.selectedDriverId), market: () => renderMarketScreen(state.world, state.data, state.marketFilters), negotiations: () => renderNegotiationsScreen(state.world), "race-weekend": () => renderRaceWeekendScreen(state.world, state.data, state.ui), calendar: () => renderCalendarScreen(state.world, state.data), race: () => renderRaceScreen(state.world, state.data, state.raceRound, state.ui), standings: () => renderStandingsScreen(state.world, state.standingsMode, state.standingsScope), history: () => renderHistoryScreen(state.world, state.data, state.historyFilters), offers: () => renderOffersScreen(state.world), staff: () => renderStaffScreen(state.world), development: () => renderDevelopmentScreen(state.world, state.data), facilities: () => renderFacilitiesScreen(state.world), finances: () => renderFinanceScreen(state.world, state.data), sponsors: () => renderSponsorsScreen(state.world), news: () => renderNewsScreen(state.world, state.newsFilters), regulations: () => renderRegulationsScreen(state.world, state.data), settings: () => renderSettingsScreen(state.world), save: () => renderSaveScreen(state.world) };
  screen.innerHTML = (renderers[state.screen] ?? renderers.dashboard)();
  warnPossibleEncodingIssue();
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

function updateMobileHudContent() {
  if (!state.world) return;
  state.world.ui ??= {};
  state.world.ui.selectedMobileHudGroup = state.ui.selectedMobileHudGroup;
  const container = document.querySelector("#mobile-hud-content");
  const wrapper = document.querySelector(".mobile-hud-grouped");
  const select = document.querySelector("[data-mobile-hud-group]");
  if (container) container.innerHTML = renderMobileHudGroup(state.world, state.data, state.ui.selectedMobileHudGroup);
  if (wrapper) wrapper.dataset.hudGroup = state.ui.selectedMobileHudGroup;
  if (select) select.value = state.ui.selectedMobileHudGroup;
}

function handleMobileHudGroupChange(group) {
  if (!VALID_MOBILE_HUD_GROUPS.includes(group)) return;
  state.ui.selectedMobileHudGroup = group;
  localStorage.setItem("rumMobileHudGroup", group);
  updateMobileHudContent();
}

function standingsSnapshot(categoryId = state.world?.currentCategoryId) {
  const snapshot = structuredClone(state.world?.categoryStates?.[categoryId] ?? {});
  return {
    driverStandings: snapshot.driverStandings ?? [],
    teamStandings: snapshot.teamStandings ?? []
  };
}

function startProcessing(type, title, message) {
  state.ui.processing = {
    type,
    title,
    message,
    stepIndex: 1,
    steps: type === "season"
      ? ["Preparando calendarios", "Simulando carreras", "Actualizando campeonatos", "Generando resumen"]
      : ["Preparando grilla", "Simulando carrera", "Procesando resultados", "Actualizando universo"]
  };
  render();
  requestAnimationFrame(() => document.querySelector("#race-focus")?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function finishProcessing() {
  state.ui.processing = null;
}

function showRaceResult(race, preSnapshot = null, message = "Carrera finalizada.") {
  state.ui.postRaceResult = race ? { race, preSnapshot } : null;
  state.ui.seasonSummary = null;
  if (race) {
    state.screen = "race";
    state.world.viewCategoryId = race.categoryId;
    state.raceRound = String(race.round);
  }
  persist(message);
  render();
  requestAnimationFrame(() => document.querySelector("#race-focus")?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function continueSave() {
  if (saveRequiresNewGame()) { toast("El guardado es demasiado antiguo: iniciÃ¡ una nueva partida."); chooseTeam(); return; }
  const loaded = loadGame(state.data);
  if (!loaded) return toast("No hay una partida vÃ¡lida para cargar.");
  state.world = loaded;
  state.screen = "dashboard";
  state.mobileMoreOpen = false;
  state.ui.selectedMobileHudGroup = loaded.ui?.selectedMobileHudGroup ?? loaded.selectedMobileHudGroup ?? state.ui.selectedMobileHudGroup;
  state.ui.postRaceResult = null;
  state.ui.seasonSummary = null;
  toast("Partida cargada correctamente.", "good");
  render();
}

function readOfferForm() { return { salary: Number(document.querySelector("#offer-salary")?.value ?? 0), duration: Number(document.querySelector("#offer-duration")?.value ?? 2), role: document.querySelector("#offer-role")?.value ?? "second_driver", signingBonus: Number(document.querySelector("#offer-bonus")?.value ?? 0), releaseClause: Number(document.querySelector("#offer-clause")?.value ?? 0), optionYears: Number(document.querySelector("#offer-option")?.value ?? 0) }; }
function readWeekendSetup() { return { setup: { aeroLevel: document.querySelector("#rw-aero")?.value ?? "medium", suspension: document.querySelector("#rw-suspension")?.value ?? "balanced", brakeBias: document.querySelector("#rw-brakes")?.value ?? "balanced", engineMode: document.querySelector("#rw-engine")?.value ?? "normal" }, program: document.querySelector("#rw-program")?.value ?? "balance", risk: document.querySelector("#rw-risk")?.value ?? "medium", racePlan: { default: { startTyre: document.querySelector("#rw-start-tyre")?.value ?? "medium", pace: document.querySelector("#rw-pace")?.value ?? "balanced", mode: document.querySelector("#rw-plan")?.value ?? "attack" } } }; }

document.addEventListener("change", event => {
  if (event.target.id === "category-selector" && state.world) { state.world.viewCategoryId = event.target.value; state.selectedDriverId = null; state.raceRound = "latest"; state.historyFilters.category = "current"; render(); }
  if (event.target.dataset.raceRound) { state.raceRound = event.target.value; render(); }
  if (event.target.dataset.mobileHudGroup) { handleMobileHudGroupChange(event.target.value); }
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
  if (action === "dismiss-race-summary") { state.ui.postRaceResult = null; state.ui.seasonSummary = null; render(); return; }
  if (action === "view-full-race-result") { state.ui.postRaceResult = null; render(); requestAnimationFrame(() => document.querySelector(".race-desktop-table,.race-result-compact")?.scrollIntoView({ behavior: "smooth", block: "start" })); return; }
  if (action === "go-settings-from-home") { toast("CreÃ¡ o cargÃ¡ una partida para abrir ConfiguraciÃ³n."); return; }
  if (action === "toggle-mobile-more") { state.mobileMoreOpen = !state.mobileMoreOpen; renderMobileNav(); return; }
  if (action === "go" && state.world) { state.screen = button.dataset.screen; state.selectedDriverId = null; state.mobileMoreOpen = false; document.querySelector("#app").classList.remove("menu-open"); render(); return; }
  if (action === "new-game") { chooseTeam(); return; }
  if (action === "continue-game" || action === "load") { continueSave(); return; }
  if (action === "close-modal") { modalRoot.innerHTML = ""; return; }
  if (action === "select-team") { state.world = createWorld(state.data, button.dataset.team); state.screen = "dashboard"; state.ui.selectedMobileHudGroup = "team"; state.ui.postRaceResult = null; state.ui.seasonSummary = null; state.world.ui = { selectedMobileHudGroup: "team" }; modalRoot.innerHTML = ""; persist("Partida creada."); render(); return; }
  if (action === "save" && state.world) { persist("Partida guardada."); return; }
  if (action === "delete-save" && confirm("¿Borrar definitivamente la partida guardada?")) { deleteSave(); toast("Slot borrado."); render(); return; }
  if (action === "simulate-race") { if (state.ui.processing) return; const pre = standingsSnapshot(state.world.currentCategoryId); startProcessing("race", "Simulando carrera...", "Procesando estrategias y campeonato."); setTimeout(() => { const race = simulateNextRace(state.world, state.data); finishProcessing(); if (race) showRaceResult(race, pre, `Ronda ${race.round} simulada.`); else { toast("No hay carrera pendiente."); render(); } }, 220); return; }
  if (action === "simulate-world") { if (state.ui.processing) return; const pre = standingsSnapshot(state.world.currentCategoryId); startProcessing("race-global", "Simulando fin de semana...", "Avanzando categorías y actualizando el mundo."); setTimeout(() => { const races = simulateGlobalWeekend(state.world, state.data); finishProcessing(); const playerRace = races.find(r => r.categoryId === state.world.currentCategoryId) ?? races.at(-1); if (playerRace) showRaceResult(playerRace, pre, `${races.length} categorías avanzaron este fin de semana.`); else { persist("No hubo carreras pendientes."); render(); } }, 260); return; }
  if (action === "simulate-season") { if (state.ui.processing) return; if (!confirm("Se simularán todas las carreras pendientes de todas las categorías. ¿Continuar?")) return; startProcessing("season", "Simulando temporada...", "Procesando carreras, campeonatos y noticias."); setTimeout(() => { const races = simulateRemainingSeason(state.world, state.data); finishProcessing(); state.ui.postRaceResult = null; state.ui.seasonSummary = { races }; state.screen = "race"; persist(`${races.length} carreras simuladas. Universo listo para cerrar.`); render(); requestAnimationFrame(() => document.querySelector("#race-focus")?.scrollIntoView({ behavior: "smooth", block: "start" })); }, 320); return; }
  if (action === "finish-season") { const result = finishSeason(state.world, state.data); toast(result.message, result.ok ? "good" : ""); if (result.ok) { state.screen = "negotiations"; persist("Nueva temporada creada."); } render(); return; }
  if (action === "start-weekend") { initializeRaceWeekend(state.world, state.world.currentCategoryId); state.screen = "race-weekend"; persist("Race Weekend iniciado."); render(); return; }
  if (action === "apply-weekend-setup") { const result = applyWeekendSetup(state.world, readWeekendSetup()); toast(result.message, result.ok ? "good" : ""); if (result.ok) persist("Setup actualizado."); render(); return; }
  if (action === "run-practice") { if (state.ui.processing) return; startProcessing("session", "Corriendo práctica...", "Recolectando feedback del piloto."); setTimeout(() => { applyWeekendSetup(state.world, readWeekendSetup()); runPracticeSession(state.world); finishProcessing(); persist("Práctica completada."); state.ui.lastSessionSummary = { type: "practice", at: Date.now() }; render(); requestAnimationFrame(() => document.querySelector("#session-focus")?.scrollIntoView({ behavior: "smooth", block: "start" })); }, 180); return; }
  if (action === "run-qualifying") { if (state.ui.processing) return; startProcessing("session", "Corriendo clasificación...", "Ordenando la grilla y detectando sorpresas."); setTimeout(() => { runQualifyingSession(state.world); finishProcessing(); persist("Clasificación completada."); state.ui.lastSessionSummary = { type: "qualifying", at: Date.now() }; render(); requestAnimationFrame(() => document.querySelector("#session-focus")?.scrollIntoView({ behavior: "smooth", block: "start" })); }, 180); return; }
  if (action === "run-weekend-race") { if (state.ui.processing) return; startProcessing("race-weekend", "Corriendo carrera...", "Procesando segmentos y estrategia."); setTimeout(() => { runRaceSession(state.world); finishProcessing(); persist("Carrera por segmentos completada."); state.ui.lastSessionSummary = { type: "race", at: Date.now() }; render(); requestAnimationFrame(() => document.querySelector("#session-focus")?.scrollIntoView({ behavior: "smooth", block: "start" })); }, 220); return; }
  if (action === "finalize-weekend") { if (state.ui.processing) return; const pre = standingsSnapshot(state.world.currentCategoryId); startProcessing("race-weekend-finalize", "Finalizando GP...", "Archivando resultado y actualizando campeonato."); setTimeout(() => { const result = finalizeRaceWeekend(state.world, state.data); finishProcessing(); toast(result.message, result.ok ? "good" : ""); if (result.ok) showRaceResult(result.race, pre, "Race Weekend finalizado."); else render(); }, 220); return; }
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
    setStartupMode("loading");
    state.data = await loadData();
    setStartupMode("ready");
    hideLoading();
    render();
  } catch (error) {
    showStartupError(error);
  }
}

boot();


