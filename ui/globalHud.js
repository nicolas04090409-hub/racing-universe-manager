import { getUserTeamSummary } from "../engine/summaryEngine.js";
import { formatMoneyCompact } from "./helpers.js";

const GROUP_LABELS = {
  team: "Equipo",
  championship: "Campeonato",
  finances: "Finanzas",
  activity: "Actividad"
};

function metric(screen, label, value, tone = "") {
  return `<button data-action="go" data-screen="${screen}"><span>${label}</span><strong class="${tone}">${value}</strong></button>`;
}

function groupedMetrics(summary, world, group) {
  const balanceTone = summary.balance >= 0 ? "good" : "bad";
  const next = summary.nextRace?.name?.split(" ").slice(0, 2).join(" ") ?? "Completo";
  const bestDriver = summary.bestDriver ? `${summary.bestDriverStanding?.position ? `P${summary.bestDriverStanding.position} ` : ""}${summary.bestDriver.name.split(" ").at(-1)}` : "—";
  const groups = {
    team: [
      metric("team", "Equipo", summary.team.shortName),
      metric("development", "Coche", summary.carRating),
      metric("development", "Confiabilidad", summary.reliability)
    ],
    championship: [
      metric("standings", "Constructores", `P${summary.position ?? "—"}`),
      metric("drivers", "Mejor piloto", bestDriver),
      metric("calendar", "Ronda", `R${Math.min(summary.round, summary.totalRounds)}/${summary.totalRounds}`)
    ],
    finances: [
      metric("finances", "Caja", formatMoneyCompact(summary.budget)),
      metric("finances", "Balance", formatMoneyCompact(summary.balance), balanceTone),
      metric("sponsors", "Sponsors", `${summary.team.sponsorContracts?.length ?? 0}`)
    ],
    activity: [
      metric("calendar", "Próxima", next),
      metric("development", "Proyectos", summary.projects.total),
      metric("news", "Temporada", world.currentSeason)
    ]
  };
  return groups[group] ?? groups.team;
}

export function renderGlobalHud(world, data, selectedGroup = "team") {
  if (!world) return "";
  const s = getUserTeamSummary(world, data);
  const group = selectedGroup in GROUP_LABELS ? selectedGroup : "team";
  const allMetrics = [
    ...groupedMetrics(s, world, "finances"),
    ...groupedMetrics(s, world, "championship"),
    ...groupedMetrics(s, world, "team"),
    ...groupedMetrics(s, world, "activity")
  ];
  return `<div class="global-hud" style="--team-color:${s.team.color};--team-primary:${s.team.theme?.primaryColor ?? s.team.color};--team-secondary:${s.team.theme?.secondaryColor ?? s.team.color}">
    <div class="hud-main"><strong>${s.team.name}</strong><span>${s.category.shortName}</span><span>Temp. ${world.currentSeason}</span><span>R${Math.min(s.round, s.totalRounds)}/${s.totalRounds}</span></div>
    <div class="mobile-hud-grouped">
      <label><span>HUD</span><select data-mobile-hud-group>${Object.entries(GROUP_LABELS).map(([id, label]) => `<option value="${id}" ${id === group ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <div class="mobile-hud-metrics">${groupedMetrics(s, world, group).join("")}</div>
    </div>
    <div class="hud-strip desktop-hud-strip">${allMetrics.join("")}</div>
  </div>`;
}
