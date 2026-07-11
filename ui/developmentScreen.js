import { componentLabels, projectQuote } from "../engine/developmentEngine.js";
import { developmentDelta, developmentTrend } from "../engine/developmentBaselineEngine.js";
import { formatMoneyCompact, pageHead, progress, userTeam } from "./helpers.js";

const sign = value => value > 0 ? `+${value}` : String(value);
const areaValue = (dev, keys) => Math.round(keys.reduce((sum, key) => sum + (dev?.[key] ?? 0), 0) / keys.length);

function carAreas(team) {
  const dev = team.carDevelopment ?? {};
  return {
    aero: areaValue(dev, ["frontWing", "rearWing", "floor"]),
    engine: areaValue(dev, ["engine", "ers", "cooling"]),
    chassis: areaValue(dev, ["chassis", "suspension", "brakes", "weight"]),
    reliability: Math.round(dev.reliability ?? team.reliability ?? 0)
  };
}

function teamDevelopmentRow(world, team, position) {
  const active = (world.developmentProjects ?? []).filter(p => p.teamId === team.id && ["planned", "active"].includes(p.status));
  const completed = (world.projectHistory ?? []).filter(p => p.teamId === team.id && p.season === world.currentSeason && p.type !== "facility");
  const investment = active.reduce((sum, p) => sum + (p.investment ?? 0), 0);
  const delta = developmentDelta(team);
  const areas = carAreas(team);
  const trend = developmentTrend(team, active.length, investment);
  return {
    position,
    team,
    active,
    completed,
    investment,
    delta,
    areas,
    trend
  };
}

export function renderDevelopmentScreen(world) {
  const team = userTeam(world);
  const projects = (world.developmentProjects ?? []).filter(p => p.teamId === team.id);
  const components = Object.entries(team.carDevelopment ?? {});
  const rows = world.teams
    .filter(t => t.categoryId === team.categoryId)
    .sort((a, b) => (b.carPerformance ?? 0) - (a.carPerformance ?? 0))
    .map((t, index) => teamDevelopmentRow(world, t, index + 1));
  const playerRow = rows.find(r => r.team.id === team.id);

  return `${pageHead("Ingeniería / Desarrollo", `Componentes modulares · Presupuesto ${formatMoneyCompact(team.budget)}`)}
  <article class="card notice"><strong>Qué estás viendo:</strong> invertís en el coche y comparás tu evolución real contra rivales. La mejora de temporada se calcula contra una foto técnica tomada al iniciar el año, no por etiquetas sueltas.</article>
  <div class="development-overview card"><div><span class="kicker">PAQUETE ${world.currentSeason}</span><h2>Nivel global ${team.carPerformance}</h2><p>Inicio de temporada ${playerRow?.delta.base.carPerformance ?? team.carPerformance} · evolución ${sign(playerRow?.delta.global ?? 0)} · ${playerRow?.trend ?? "Estable"}</p></div><div class="tech-orbit"><strong>${team.carPerformance}</strong><span>TECH</span></div></div>
  <div class="mobile-card-list development-mobile-cards">
    <article class="card"><span class="metric-label">Rating global</span><h3>${team.carPerformance}</h3>${progress("Confiabilidad", team.reliability, "green")}</article>
    <article class="card"><span class="metric-label">Rivales</span><h3>${playerRow?.position ?? "—"}/${rows.length}</h3><p>Comparativa de desarrollo activa.</p></article>
    <article class="card"><span class="metric-label">Evolución real</span><h3>${sign(playerRow?.delta.global ?? 0)}</h3><p>Desde baseline ${world.currentSeason}.</p></article>
  </div>
  ${pageHead("Proyectos activos", `${projects.filter(p => p.status === "active").length} en curso`)}
  <div class="grid two">${projects.map(p => `<article class="card"><div class="card-title-row"><div><span class="pill ${p.status === "completed" ? "good" : p.status === "failed" ? "bad" : "info"}">${p.status}</span><h3>${componentLabels[p.component]}</h3><p>Riesgo ${p.risk}% · Ganancia esperada +${p.expectedGainMin}-${p.expectedGainMax}</p></div><strong>${Math.round(p.progress)}%</strong></div>${progress("Progreso", p.progress, "blue")}<p>Inversión: ${formatMoneyCompact(p.investment)}</p></article>`).join("") || `<article class="card notice">No hay proyectos activos. Elegí un componente para iniciar I+D.</article>`}</div>
  ${pageHead("Componentes del auto", "Iniciar proyectos de mejora")}
  <div class="grid three development-grid">${components.map(([component, value]) => {
    const quote = projectQuote(team, component);
    const active = projects.some(p => p.component === component && ["planned", "active"].includes(p.status));
    const disabledReason = team.budget < quote.cost ? "Presupuesto insuficiente" : value >= 100 ? "Componente al máximo" : active ? "Ya hay proyecto activo" : "";
    return `<article class="card tech-card"><div class="tech-card-head"><div><span class="metric-label">COMPONENTE</span><h3>${componentLabels[component] ?? component}</h3></div><strong>${value}</strong></div>${progress("Nivel actual", value, component === "reliability" ? "green" : "blue")}<p>Costo ${formatMoneyCompact(quote.cost)} · ${quote.durationWeeks} semanas · riesgo ${quote.risk}% · mejora +${quote.expectedGainMin}-${quote.expectedGainMax}</p><button class="button full" data-action="start-development" data-component="${component}" ${disabledReason ? "disabled" : ""} title="${disabledReason || "Iniciar proyecto"}">Iniciar proyecto</button>${disabledReason ? `<small class="muted">${disabledReason}</small>` : ""}</article>`;
  }).join("")}</div>
  ${pageHead("Comparativa de desarrollo", "Inicio de temporada vs estado actual")}
  <div class="compact-ranking-list tech-ranking-list">${rows.map(row => `<details class="compact-ranking-row ${row.team.id === team.id ? "is-player" : ""}"><summary><span class="rank">#${row.position}</span><span class="name">${row.team.shortName ?? row.team.name}</span><strong>${row.team.carPerformance} <em>${sign(row.delta.global)}</em></strong></summary><div class="compact-row-details"><span>Aero ${row.areas.aero} (${sign(row.delta.areas.aerodynamics)})</span><span>Motor ${row.areas.engine} (${sign(row.delta.areas.engine)})</span><span>Chasis ${row.areas.chassis} (${sign(row.delta.areas.chassis)})</span><span>Conf. ${row.areas.reliability} (${sign(row.delta.areas.reliability)})</span><span>${row.active.length} activo(s) · ${row.completed.length} completado(s)</span><b>${row.trend}</b></div></details>`).join("")}</div>
  <div class="table-wrap dev-desktop-table"><table class="data-table"><thead><tr><th>Equipo</th><th>Inicio</th><th>Actual</th><th>Evolución</th><th>Aerodinámica</th><th>Motor</th><th>Chasis</th><th>Confiabilidad</th><th>Proyectos</th><th>Tendencia</th></tr></thead><tbody>${rows.map(row => `<tr><td>${row.team.name}</td><td>${row.delta.base.carPerformance}</td><td><strong>${row.team.carPerformance}</strong></td><td>${sign(row.delta.global)}</td><td>${row.areas.aero} (${sign(row.delta.areas.aerodynamics)})</td><td>${row.areas.engine} (${sign(row.delta.areas.engine)})</td><td>${row.areas.chassis} (${sign(row.delta.areas.chassis)})</td><td>${row.areas.reliability} (${sign(row.delta.areas.reliability)})</td><td>${row.active.length} act. · ${row.completed.length} comp.</td><td>${row.trend}</td></tr>`).join("")}</tbody></table></div>`;
}
