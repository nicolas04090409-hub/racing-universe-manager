import { calculateTeamFinances } from "../engine/economyEngine.js";
import { formatMoneyCompact, pageHead, userTeam } from "./helpers.js";
import { metricCard } from "./components.js";

export function renderFinanceScreen(world) {
  const team = userTeam(world), f = calculateTeamFinances(team, world);
  const warning = f.projectedBalance < 0 ? "El balance proyectado está en rojo: revisá salarios, proveedores o I+D." : "Proyección estable para la temporada.";
  return `${pageHead("Finanzas", `${team.name} · ingresos, costos y proyección`)}
  <article class="card notice"><strong>Qué estás viendo:</strong> caja, sponsors, premios estimados, salarios, proveedores, viajes, operación y proyectos activos. Se recalcula al avanzar el mundo o tomar decisiones.</article>
  <div class="mobile-card-list finance-mobile-cards">
    <article class="card"><span class="metric-label">Cash</span><h3>${formatMoneyCompact(f.cash)}</h3><p>Presupuesto disponible para operar, contratar y desarrollar.</p></article>
    <article class="card"><span class="metric-label">Balance proyectado</span><h3 class="${f.projectedBalance>=0?"good":"bad"}">${formatMoneyCompact(f.projectedBalance)}</h3><p>${warning}</p></article>
    <article class="card"><span class="metric-label">Ingresos</span><h3>${formatMoneyCompact(f.sponsorIncome + f.prizeMoney)}</h3><p>Sponsors ${formatMoneyCompact(f.sponsorIncome)} · premios ${formatMoneyCompact(f.prizeMoney)}</p></article>
    <article class="card"><span class="metric-label">Gastos</span><h3>${formatMoneyCompact(f.driverSalaries + f.staffSalaries + f.supplierCosts + f.operatingCosts)}</h3><p>Salarios, proveedores y operación.</p></article>
  </div>
  <div class="grid four">${metricCard("Caja", formatMoneyCompact(f.cash), "Presupuesto disponible", "good")}${metricCard("Ingresos sponsors", formatMoneyCompact(f.sponsorIncome), "Contratos activos", "good")}${metricCard("Gastos operativos", formatMoneyCompact(f.operatingCosts + f.travelCosts), "Operación y viajes", "bad")}${metricCard("Balance proyectado", formatMoneyCompact(f.projectedBalance), warning, f.projectedBalance >= 0 ? "good" : "bad")}</div>
  <article class="card finance-ledger"><div class="metric-label">INGRESOS</div><div class="ledger-row"><span>Sponsors</span><strong class="good">+ ${formatMoneyCompact(f.sponsorIncome)}</strong></div><div class="ledger-row"><span>Prize money registrado</span><strong class="good">+ ${formatMoneyCompact(f.prizeMoney)}</strong></div><div class="divider"></div><div class="metric-label">GASTOS</div><div class="ledger-row"><span>Salarios pilotos</span><strong class="bad">− ${formatMoneyCompact(f.driverSalaries)}</strong></div><div class="ledger-row"><span>Salarios staff</span><strong class="bad">− ${formatMoneyCompact(f.staffSalaries)}</strong></div><div class="ledger-row"><span>Proveedores</span><strong class="bad">− ${formatMoneyCompact(f.supplierCosts)}</strong></div><div class="ledger-row"><span>I+D activo</span><strong class="bad">− ${formatMoneyCompact(f.developmentSpend)}</strong></div><div class="ledger-row"><span>Instalaciones activas</span><strong class="bad">− ${formatMoneyCompact(f.facilitySpend)}</strong></div><div class="ledger-row"><span>Viajes restantes</span><strong class="bad">− ${formatMoneyCompact(f.travelCosts)}</strong></div><div class="ledger-row"><span>Operación</span><strong class="bad">− ${formatMoneyCompact(f.operatingCosts)}</strong></div><div class="ledger-row total"><span>Balance proyectado</span><strong class="${f.projectedBalance >= 0 ? "good" : "bad"}">${formatMoneyCompact(f.projectedBalance)}</strong></div></article>
  <p class="notice">${warning}</p>`;
}
