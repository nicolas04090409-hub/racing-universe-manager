import { evaluateSponsorInterest, formatSponsorRequirement } from "../engine/sponsorEngine.js";
import { formatMoneyCompact, pageHead, userTeam } from "./helpers.js";

function sponsorCard({ sponsor, contract, team, world }) {
  const active = Boolean(contract);
  const interest = active ? null : Math.round(evaluateSponsorInterest(sponsor, team, world));
  const satisfaction = Math.round(contract?.satisfaction ?? 60);
  const value = active
    ? contract.valuePerSeason
    : Math.round((sponsor.budget ?? 500000) * (0.22 + interest / 260) / 100000) * 100000;
  const requirements = active ? contract.bonusConditions ?? [] : sponsor.requirements ?? [];
  const tone = satisfaction >= 70 ? "good" : satisfaction < 45 ? "bad" : "warn";
  return `<article class="card sponsor-card">
    <div class="card-title-row">
      <div>
        <span class="pill ${active ? tone : "info"}">${active ? `${satisfaction}/100` : `${interest}/100 interés`}</span>
        <h3>${sponsor?.name ?? contract?.sponsorId ?? "Sponsor"}</h3>
        <p>${sponsor?.industry ?? "Sponsor"}${active ? ` · expira ${contract.expiresAt}` : ` · prestigio ${sponsor.prestige ?? "medio"}`}</p>
      </div>
      <strong class="metric-value small good">${formatMoneyCompact(value)}</strong>
    </div>
    <p><strong>Requisitos:</strong> ${requirements.map(formatSponsorRequirement).join(", ") || "Exposición, resultados y buena reputación."}</p>
    ${active ? "" : `<button class="button primary full" data-action="send-sponsor-proposal" data-sponsor="${sponsor.id}">Enviar propuesta</button>`}
  </article>`;
}

export function renderSponsorsScreen(world) {
  const team = userTeam(world);
  const current = team.sponsorContracts ?? [];
  const currentIds = new Set(current.map(c => c.sponsorId));
  const available = (world.sponsors ?? [])
    .filter(s => !currentIds.has(s.id) && s.preferredCategories?.includes(team.categoryId))
    .sort((a, b) => evaluateSponsorInterest(b, team, world) - evaluateSponsorInterest(a, team, world));

  return `${pageHead("Sponsors", `${team.name} · ingresos, objetivos comerciales y satisfacción`)}
  <article class="card notice"><strong>Qué estás viendo:</strong> los sponsors aportan ingresos por temporada. Su satisfacción depende de resultados, perfil del equipo, pilotos contratados, objetivos comerciales y exposición mediática. Una satisfacción alta mejora renovaciones y ofertas; una baja puede reducir ingresos o cortar la relación al final de temporada.</article>
  <div class="grid two">
    <article class="card"><h3>¿Cómo mejorar satisfacción?</h3><ul><li>Cumplir objetivos deportivos.</li><li>Contratar pilotos con alto atractivo comercial.</li><li>Contratar pilotos de mercados relevantes para el sponsor.</li><li>Mejorar reputación, conseguir podios/victorias y evitar crisis.</li></ul></article>
    <article class="card"><h3>Negociación básica</h3><p>Enviá propuestas desde sponsors disponibles. El sponsor puede aceptar, rechazar o pedir mejores resultados, un piloto más comercial o presencia en una categoría superior.</p></article>
  </div>
  ${pageHead("Sponsors activos", `${current.length} contratos vigentes`)}
  <div class="sponsor-card-list">${current.map(contract => sponsorCard({ sponsor: world.sponsors.find(s => s.id === contract.sponsorId), contract, team, world })).join("") || `<article class="card notice">Sin sponsors activos.</article>`}</div>
  ${pageHead("Sponsors disponibles", "Interés estimado según reputación, pilotos, categoría, fanbase y finanzas")}
  <div class="sponsor-card-list">${available.slice(0, 20).map(sponsor => sponsorCard({ sponsor, team, world })).join("") || `<article class="card notice">No hay sponsors disponibles.</article>`}</div>
  <article class="card"><span class="metric-label">OBJETIVOS DEL EQUIPO</span><div class="grid two">${Object.entries(team.seasonObjectives ?? {}).map(([key, value]) => `<div class="objective"><span>${key}</span><strong>${value}</strong><em>En curso</em></div>`).join("")}</div></article>`;
}
