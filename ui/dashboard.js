import { getUserTeamSummary } from "../engine/summaryEngine.js";
import { contractStatus } from "../engine/contractEngine.js";
import { driverOverall, formatMoneyCompact, getDriver, money, potentialSummary, progress, userTeam } from "./helpers.js";
import { avatar, metricCard, newsItem } from "./components.js";

function actionCard(title,body,action,label="Abrir"){
  return `<article class="card mobile-action-card"><h3>${title}</h3><p>${body}</p><button type="button" class="button full" data-action="go" data-screen="${action}">${label}</button></article>`;
}

function latestRaceCard(world,team,latest){
  if(!latest)return"";
  const ids=new Set(team.drivers??[]);
  const player=latest.results?.filter(r=>ids.has(r.driverId))??[];
  const points=player.reduce((sum,r)=>sum+(r.points??0),0);
  const teamRow=world.categoryStates?.[team.categoryId]?.teamStandings?.find(r=>r.teamId===team.id);
  return `<article class="card latest-race-card"><span class="metric-label">ÚLTIMA CARRERA</span><h3>R${latest.round} · ${latest.weather??"Clima variable"}</h3>${player.map(r=>`<div class="standing-line"><b>${getDriver(world,r.driverId)?.name?.split(" ").at(-1)??r.driverId}</b><span>P${r.position}</span><strong>${r.points??0} pts</strong></div>`).join("")||`<p class="muted">Sin pilotos del equipo en el resultado.</p>`}<p>+${points} puntos · Constructores P${teamRow?.position??"—"}</p><button class="button full" data-action="go" data-screen="race">Ver resultado</button></article>`;
}

function paddockAlerts(world,summary,drivers){
  const alerts=[];
  const expiring=drivers.filter(d=>d.contractUntil<=world.currentSeason+1);
  if(expiring.length)alerts.push(`Contrato por vencer: ${expiring.map(d=>d.name.split(" ").at(-1)).join(", ")}`);
  const lowMorale=drivers.find(d=>(d.morale??70)<55);
  if(lowMorale)alerts.push(`Moral baja: ${lowMorale.name}`);
  if(summary.projects.development?.some(p=>p.progress>=100)||summary.projects.facilities?.some(p=>p.progress>=100))alerts.push("Proyecto listo para revisar");
  if(summary.nextRace)alerts.push(`Race Weekend disponible: ${summary.nextRace.name}`);
  const sponsorIssue=userTeam(world).sponsorContracts?.find(s=>(s.satisfaction??60)<45);
  if(sponsorIssue)alerts.push("Sponsor insatisfecho");
  return alerts.slice(0,4);
}

export function renderDashboard(world,data){
  const team=userTeam(world),summary=getUserTeamSummary(world,data),drivers=team.drivers.map(id=>getDriver(world,id)).filter(Boolean);
  const expiring=drivers.filter(d=>d.contractUntil<=world.currentSeason+1),criticalNews=world.news.filter(n=>["warning","bad"].includes(n.tone)).slice(0,3);
  const latest=[...(world.raceResults??[])].reverse().find(r=>r.categoryId===team.categoryId);
  const winner=latest?getDriver(world,latest.results?.[0]?.driverId)?.name:null;
  const weekend=world.activeWeekend?.categoryId===team.categoryId?world.activeWeekend:null;
  const circuit=summary.nextRace;
  const stage=weekend?.stage==="setup"?"Viernes · Setup":weekend?.stage==="practice"?"Viernes · Prácticas":weekend?.stage==="qualifying"?"Sábado · Qualy":weekend?.stage==="race"?"Domingo · Carrera":weekend?.stage==="post_race"?"Post carrera":"Previo al GP";
  const alerts=paddockAlerts(world,summary,drivers);

  return`<section class="dashboard-hero"><div><span class="kicker">${summary.category.name} · ${summary.category.realEquivalent} · ${world.currentSeason}</span><h2>${summary.nextRace?summary.nextRace.name:"Temporada completada"}</h2><p>${summary.nextRace?`${summary.nextRace.location}, ${summary.nextRace.country}: ${summary.nextRace.laps} vueltas · ronda ${summary.round}/${summary.totalRounds}.`:"El calendario de tu categoría está completo."}</p></div><div class="hero-rank"><span>CONSTRUCTORES</span><strong>${summary.position??"—"}</strong><small>POSICIÓN ACTUAL</small></div></section>

  <section class="paddock-hub">
    <article class="card paddock-hero" style="--team-color:${team.color}">
      <span class="metric-label">PADDOCK HUB</span>
      <h2>${team.shortName}</h2>
      <p>${summary.category.name} Â· Temp. ${world.currentSeason} Â· R${Math.min(summary.round,summary.totalRounds)}/${summary.totalRounds}</p>
      <h3>${circuit?`${circuit.name} · ${stage}`:"Temporada completada"}</h3>
      <div class="actions"><button type="button" class="button primary" data-action="go" data-screen="race-weekend">Ir al Race Weekend</button><button type="button" class="button" data-action="save">Guardar</button></div>
    </article>
    ${alerts.length?`<div class="paddock-alerts">${alerts.map(text=>`<article class="card alert-card"><span>!</span><p>${text}</p></article>`).join("")}</div>`:""}
    <div class="mobile-dashboard-cards paddock-cards">
      ${latestRaceCard(world,team,latest)}
      ${actionCard("Próximo evento",circuit?`${circuit.name} · ${stage} · lluvia ${circuit.rainProbability}%`:"Calendario completado","race-weekend","Ir al Race Weekend")}
      ${actionCard("Equipo",`Constructores P${summary.position??"—"} · coche ${summary.carRating} · moral ${Math.round(drivers.reduce((a,d)=>a+(d.morale??70),0)/Math.max(1,drivers.length))} · conf. ${summary.reliability}`,"team","Ver equipo")}
      <article class="card mobile-action-card"><h3>Pilotos</h3>${drivers.map(d=>{const contract=contractStatus(d,world.currentSeason);return`<div class="standing-line"><b>P${summary.driverStandings?.find?.(r=>r.driverId===d.id)?.position??"—"}</b><span>${d.name} · moral ${d.morale}</span><strong>${contract.label}</strong></div>`}).join("")}<button type="button" class="button full" data-action="go" data-screen="drivers">Ver pilotos</button></article>
      <article class="card mobile-action-card"><h3>Ingeniería</h3><p>${summary.projects.total?summary.projects.label:"Sin proyectos activos"}.</p>${[...summary.projects.development,...summary.projects.facilities].slice(0,1).map(p=>`${progress("Progreso",p.progress,"blue")}<p>${p.weeksRemaining??"?"} semana(s) restantes</p>`).join("")}<button type="button" class="button full" data-action="go" data-screen="development">Ver desarrollo</button></article>
      ${actionCard("Mercado",`${stateText(expiring.length,"contrato por vencer","contratos por vencer")} · ${(world.negotiations??[]).filter(n=>["sent","counter","accepted","waiting"].includes(n.status)).length} negociación(es) activas.`,"market","Ver mercado")}
      <article class="card mobile-action-card"><h3>Noticias</h3><div class="news-list">${world.news.slice(0,3).map(newsItem).join("")}</div><button type="button" class="button full" data-action="go" data-screen="news">Ver noticias</button></article>
    </div>
  </section>

  <div class="grid four dashboard-metrics">${metricCard("Equipo",team.shortName,team.name)}${metricCard("Balance",money(summary.balance),summary.balance>=0?"Proyección positiva":"Revisar gastos",summary.balance>=0?"good":"bad")}${metricCard("Coche",summary.carRating,`Confiabilidad ${summary.reliability}`)}${metricCard("Proyectos",summary.projects.total,summary.projects.label)}</div>
  <div class="dashboard-grid"><div class="dashboard-main stack">
    <article class="card race-preview"><div class="card-title-row"><div><div class="metric-label">PRÓXIMA CARRERA</div><h2>${summary.nextRace?.name??"Calendario completado"}</h2></div><span class="round-badge">${summary.nextRace?.countryCode??"—"}</span></div>${summary.nextRace?`<div class="race-facts"><div><span>Tipo</span><strong>${summary.nextRace.streetCircuit?"Callejero":"Permanente"}</strong></div><div><span>Adelantamiento</span><strong>${summary.nextRace.overtaking}</strong></div><div><span>Neumáticos</span><strong>${summary.nextRace.tyreWear}</strong></div><div><span>Lluvia</span><strong>${summary.nextRace.rainProbability}%</strong></div></div><div class="actions"><button type="button" class="button primary" data-action="go" data-screen="race-weekend">Abrir Race Weekend</button><button type="button" class="button" data-action="simulate-world">Simular mundo</button></div>`:""}</article>
    <article class="card"><div class="metric-label">PILOTOS PRINCIPALES</div><div class="driver-line-grid">${drivers.map(d=>{const contract=contractStatus(d,world.currentSeason),pot=potentialSummary(d,team);return`<button type="button" class="driver-line" data-action="view-driver" data-driver="${d.id}">${avatar(d)}<div><strong>${d.name}</strong><span>${d.countryCode} Â· ${d.age} aÃ±os Â· ${contract.label}</span></div><div class="driver-line-stat"><b>${driverOverall(d)}</b><small>Rating</small></div><div class="driver-line-stat stars-mini"><b>${pot.rating}</b><small>${pot.label}</small></div></button>`}).join("")}</div></article>
    <article class="card"><div class="metric-label">RENDIMIENTO DEL COCHE</div><div class="grid two compact-grid"><div>${progress("Global",summary.carRating)}${progress("Aerodinámica",team.aerodynamics)}${progress("Motor",team.engine)}</div><div>${progress("Chasis",team.chassis)}${progress("Confiabilidad",team.reliability,"green")}${progress("Setup",team.setupQuality??team.strategy,"blue")}</div></div><div class="actions"><button type="button" class="button small" data-action="go" data-screen="development">Abrir Ingeniería</button><button type="button" class="button small" data-action="go" data-screen="facilities">Instalaciones</button></div></article>
  </div><aside class="dashboard-side stack">
    <article class="card"><div class="metric-label">FINANZAS RÃPIDAS</div><div class="finance-strip"><div><span>Caja</span><strong>${money(summary.budget)}</strong></div><div><span>Balance</span><strong class="${summary.balance>=0?"good":"bad"}">${money(summary.balance)}</strong></div></div><button type="button" class="text-button full" data-action="go" data-screen="finances">Ver detalle financiero â†’</button></article>
    <article class="card"><div class="metric-label">PROYECTOS ACTIVOS</div>${summary.projects.total?`<p>${summary.projects.label}</p>${[...summary.projects.development,...summary.projects.facilities].slice(0,4).map(p=>`<div class="standing-line"><b>${Math.round(p.progress)}%</b><span>${p.component??p.facility}</span><strong>${p.status}</strong></div>`).join("")}`:`<p>No hay proyectos activos.</p>`}<button type="button" class="text-button full" data-action="go" data-screen="development">Gestionar proyectos →</button></article>
    ${latestRaceCard(world,team,latest)}
    <article class="card"><div class="metric-label">CONTRATOS POR VENCER</div>${expiring.length?expiring.map(d=>`<div class="standing-line"><b>${d.contractUntil}</b><span>${d.name}</span><strong>${formatMoneyCompact(d.salary)}</strong></div>`).join(""):`<p>No hay vencimientos urgentes.</p>`}</article>
    <article class="card"><div class="metric-label">NOTICIAS IMPORTANTES</div><div class="news-list">${(criticalNews.length?criticalNews:world.news.slice(0,3)).map(newsItem).join("")}</div></article>
  </aside></div>`;
}

function stateText(count,singular,plural){
  return `${count} ${count===1?singular:plural}`;
}


