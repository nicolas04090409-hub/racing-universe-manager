import { getUserTeamSummary } from "../engine/summaryEngine.js";
import { contractStatus } from "../engine/contractEngine.js";
import { formatMoneyCompact, getDriver, userTeam } from "./helpers.js";

export const MOBILE_HUD_GROUPS = {
  team: "Equipo",
  championship: "Campeonato",
  finances: "Finanzas",
  activity: "Actividad"
};

export const VALID_MOBILE_HUD_GROUPS = Object.keys(MOBILE_HUD_GROUPS);

function metric(screen, label, value, tone = "") {
  return `<button class="hud-metric" data-action="go" data-screen="${screen}"><span>${label}</span><strong class="${tone}">${value}</strong></button>`;
}

function driverIds(team) {
  return (team.drivers ?? []).map(d => typeof d === "string" ? d : d.id).filter(Boolean);
}

function playerDrivers(world, team) {
  return driverIds(team).map(id => getDriver(world, id)).filter(Boolean);
}

function average(values, fallback = 0) {
  const clean = values.filter(v => Number.isFinite(Number(v))).map(Number);
  return clean.length ? Math.round(clean.reduce((a, b) => a + b, 0) / clean.length) : fallback;
}

function sponsorIncome(team) {
  return (team.sponsorContracts ?? []).reduce((sum, contract) => sum + (contract.valuePerSeason ?? 0), 0);
}

function expectedSpend(team) {
  const finances = team.finances ?? {};
  return (finances.driverSalaries ?? team.driverSalaries ?? team.salaryCommitted ?? 0)
    + (finances.staffSalaries ?? team.staffSalaries ?? 0)
    + (finances.supplierCosts ?? team.supplierCosts ?? 0)
    + (finances.operatingCosts ?? team.operatingCosts ?? 0)
    + (finances.developmentSpend ?? team.developmentSpend ?? 0)
    + (finances.facilitySpend ?? team.facilitySpend ?? 0);
}

function expiringContract(world, drivers) {
  const driver = drivers.find(d => d.contractUntil <= world.currentSeason + 1);
  if (!driver) return "Sin urgencias";
  return `${driver.name.split(" ").at(-1)} ${contractStatus(driver, world.currentSeason).label}`;
}

function activeProject(summary) {
  const project = [...(summary.projects.development ?? []), ...(summary.projects.facilities ?? [])][0];
  if (!project) return "Sin proyecto";
  return project.component ?? project.facility ?? "Proyecto activo";
}

function groupedMetrics(summary, world, group) {
  const team = userTeam(world);
  const drivers = playerDrivers(world, team);
  const state = world.categoryStates?.[team.categoryId];
  const teamStanding = state?.teamStandings?.find(row => row.teamId === team.id);
  const bestDriverStanding = state?.driverStandings?.find(row => driverIds(team).includes(row.driverId));
  const bestDriver = bestDriverStanding ? getDriver(world, bestDriverStanding.driverId) : summary.bestDriver;
  const balance = team.finances?.projectedBalance ?? team.projectedBalance ?? summary.balance ?? 0;
  const negotiationCount = (world.negotiations ?? []).filter(n => ["sent", "counter", "accepted", "waiting"].includes(n.status)).length;
  const next = summary.nextRace?.name?.split(" ").slice(0, 2).join(" ") ?? "Completo";
  const groups = {
    team: [
      metric("development", "Rating coche", summary.carRating),
      metric("development", "Confiabilidad", summary.reliability),
      metric("team", "Moral media", average(drivers.map(d => d.morale), 70)),
      metric("drivers", "Titulares", drivers.map(d => d.name.split(" ").at(-1)).join(" / ") || "—")
    ],
    championship: [
      metric("standings", "Constructores", `P${teamStanding?.position ?? summary.position ?? "—"}`),
      metric("standings", "Puntos", teamStanding?.points ?? 0),
      metric("drivers", "Mejor piloto", bestDriver ? `${bestDriverStanding?.position ? `P${bestDriverStanding.position} ` : ""}${bestDriver.name.split(" ").at(-1)}` : "—"),
      metric("calendar", "Ronda", `R${Math.min(summary.round, summary.totalRounds)}/${summary.totalRounds}`)
    ],
    finances: [
      metric("finances", "Cash", formatMoneyCompact(summary.budget)),
      metric("finances", "Balance", formatMoneyCompact(balance), balance >= 0 ? "good" : "bad"),
      metric("sponsors", "Sponsors", formatMoneyCompact(sponsorIncome(team))),
      metric("finances", "Gasto previsto", formatMoneyCompact(expectedSpend(team)))
    ],
    activity: [
      metric("calendar", "Próxima carrera", next),
      metric("development", "Proyecto activo", activeProject(summary)),
      metric("team", "Contrato vence", expiringContract(world, drivers)),
      metric("negotiations", "Negociaciones", negotiationCount)
    ]
  };
  return groups[group] ?? groups.team;
}

export function renderMobileHudGroup(world, data, selectedGroup = "team") {
  if (!world) return "";
  const summary = getUserTeamSummary(world, data);
  const group = VALID_MOBILE_HUD_GROUPS.includes(selectedGroup) ? selectedGroup : "team";
  return groupedMetrics(summary, world, group).join("");
}

export function renderGlobalHud(world, data, selectedGroup = "team") {
  if (!world) return "";
  const summary = getUserTeamSummary(world, data);
  const storedGroup = world.ui?.selectedMobileHudGroup ?? selectedGroup;
  const group = VALID_MOBILE_HUD_GROUPS.includes(storedGroup) ? storedGroup : "team";
  const allMetrics = VALID_MOBILE_HUD_GROUPS.flatMap(key => groupedMetrics(summary, world, key));
  return `<div class="global-hud" style="--team-color:${summary.team.color};--team-primary:${summary.team.theme?.primaryColor ?? summary.team.color};--team-secondary:${summary.team.theme?.secondaryColor ?? summary.team.color}">
    <div class="hud-main"><strong>${summary.team.name}</strong><span>${summary.category.shortName}</span><span>Temp. ${world.currentSeason}</span><span>R${Math.min(summary.round, summary.totalRounds)}/${summary.totalRounds}</span></div>
    <div class="mobile-hud-grouped" data-hud-group="${group}">
      <label><span>Información</span><select data-mobile-hud-group>${Object.entries(MOBILE_HUD_GROUPS).map(([id, label]) => `<option value="${id}" ${id === group ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <div id="mobile-hud-content" class="mobile-hud-metrics hud-swap">${renderMobileHudGroup(world, data, group)}</div>
    </div>
    <div class="hud-strip desktop-hud-strip">${allMetrics.join("")}</div>
  </div>`;
}
