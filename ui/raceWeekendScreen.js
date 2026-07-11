import { TYRE_COMPOUNDS } from "../engine/tyreEngine.js";
import { weatherLabel } from "../engine/weatherEngine.js";
import { getCategoryState, getDriver, getTeam, pageHead, teamChip, userTeam } from "./helpers.js";

const stageLabel = { setup: "Preparación", practice: "Prácticas", qualifying: "Clasificación", race: "Carrera", post_race: "Post-race" };
const sessionLabel = { fp1: "Practice 1", fp2: "Practice 2", fp3: "Practice 3", practice: "Practice", qualifying: "Qualifying", race: "Race" };
const compactName = name => name?.split(" ").slice(-1)[0] ?? "Piloto";
const option=(value,label,current)=>`<option value="${value}" ${value===current?"selected":""}>${label}</option>`;

export function renderRaceWeekendScreen(world, data, ui = {}) {
  const team=userTeam(world),category=world.categories.find(c=>c.id===team.categoryId),state=getCategoryState(world, category.id);
  const weekend=world.activeWeekend?.categoryId===category.id?world.activeWeekend:null;
  const circuit=data.circuits.find(c=>c.id===(weekend?.circuitId??category.calendar[state.currentRound-1]));
  const controls=weekend
    ? `<div class="actions race-weekend-actions"><button class="button" data-action="run-practice" ${!["setup","practice"].includes(weekend.stage)?"disabled":""}>Correr práctica</button><button class="button" data-action="run-qualifying" ${weekend.stage!=="qualifying"?"disabled":""}>Correr qualy</button><button class="button" data-action="run-weekend-race" ${weekend.stage!=="race"?"disabled":""}>Correr carrera</button><button class="button primary" data-action="finalize-weekend" ${weekend.stage!=="post_race"?"disabled":""}>Finalizar GP</button></div>`
    : `<div class="actions"><button class="button primary" data-action="start-weekend">Iniciar Race Weekend</button><button class="button" data-action="simulate-race">Simular carrera clásica</button></div>`;
  let html=pageHead("Race Weekend",`${category.name} · Ronda ${state.currentRound}/${category.calendar.length}`,controls);
  if(!circuit)return html+`<article class="card notice">Calendario completado.</article>`;

  html+=`<article class="circuit-preview race-weekend-hero"><div class="circuit-number">R${state.currentRound}</div><div><span class="kicker">${circuit.countryCode} · ${circuit.location}</span><h2>${circuit.name}</h2><p>${circuit.type} · ${circuit.lengthKm} km · ${circuit.laps} vueltas · ${circuit.streetCircuit?"Callejero":"Permanente"}</p><div class="race-facts"><div><span>Aero</span><strong>${circuit.aeroImportance}</strong></div><div><span>Motor</span><strong>${circuit.engineImportance}</strong></div><div><span>Frenos</span><strong>${circuit.brakingImportance}</strong></div><div><span>Lluvia</span><strong>${circuit.rainProbability}%</strong></div></div></div></article>`;
  if(!weekend)return html+`<article class="card"><h3>Formato</h3><p>${(category.raceRules.weekendFormat??[]).map(s=>sessionLabel[s]??s).join(" → ")}</p><p>Iniciá el Race Weekend para correr prácticas, clasificación y carrera por segmentos. En mobile el setup y la estrategia se muestran como controles táctiles.</p></article>`;

  html+=sessionSummaryBlock(world,weekend,ui)+mobileOverview(world,weekend,circuit)+setupBlock(world,weekend)+practiceBlock(world,weekend)+qualifyingBlock(world,weekend)+raceBlock(world,weekend);
  return html;
}

function sessionSummaryBlock(world,weekend,ui){
  if(!weekend||!ui?.lastSessionSummary)return"";
  const type=ui.lastSessionSummary.type;
  const playerTeam=userTeam(world);
  const ids=new Set(playerTeam.drivers??[]);
  const practiceKeys=Object.keys(weekend.sessions).filter(key=>weekend.sessions[key]?.type==="practice");
  const latestPractice=practiceKeys.at(-1);
  const session=type==="practice"?weekend.sessions[latestPractice]:type==="qualifying"?weekend.sessions.qualifying:weekend.sessions.race;
  if(!session)return"";
  const rows=(session.results??[]).filter(r=>ids.has(r.driverId));
  const title=type==="practice"?`${sessionLabel[latestPractice]??"Práctica"} finalizada`:type==="qualifying"?"Qualy finalizada":"Carrera por segmentos finalizada";
  const subtitle=type==="practice"?"Feedback de setup listo":type==="qualifying"?"Grilla confirmada":"Resultado provisional listo";
  return `<section class="card session-result-focus" id="session-focus"><div><span class="metric-label">RESUMEN DE SESIÓN</span><h2>${title}</h2><p>${subtitle}</p></div><div class="session-result-grid">${rows.map(r=>`<article><strong>${getDriver(world,r.driverId)?.name??r.driverId}</strong><span>P${r.position}</span><small>${r.feedback??r.recommendation??`${r.points??0} pts · ${r.pits??0} boxes`}</small></article>`).join("")||`<article><strong>Sin datos del equipo</strong><span>—</span><small>Revisá la tabla completa.</small></article>`}</div><div class="actions"><button class="button primary" data-action="${type==="practice"?"run-practice":type==="qualifying"?"run-weekend-race":"finalize-weekend"}">${type==="practice"?"Continuar práctica":type==="qualifying"?"Ir a carrera":"Finalizar GP"}</button><button class="button" data-action="go" data-screen="race-weekend">Ver sesión completa</button></div></section>`;
}

function mobileOverview(world,weekend,circuit){
  const setup=weekend.playerStrategy.setup??{};
  return `<div class="mobile-rw-overview">
    <article class="card"><span class="metric-label">Circuito</span><h3>${circuit.name}</h3><p>${circuit.location} · lluvia ${circuit.rainProbability}%</p></article>
    <article class="card"><span class="metric-label">Clima</span><h3>${weatherLabel(weekend.weatherForecast.practice)}</h3><p>Qualy ${weatherLabel(weekend.weatherForecast.qualifying)} · Carrera ${weatherLabel(weekend.weatherForecast.race)}</p></article>
    <article class="card"><span class="metric-label">Etapa actual</span><h3>${stageLabel[weekend.stage]}</h3><p>${weekend.format.map(s=>weekend.sessions[s]?"✓":sessionLabel[s]??s).join(" · ")}</p></article>
    <article class="card"><span class="metric-label">Setup actual</span><h3>${setup.aeroLevel??"medium"} · ${setup.suspension??"balanced"}</h3><p>Motor ${setup.engineMode??"normal"} · frenos ${setup.brakeBias??"balanced"}</p></article>
  </div>`;
}

function setupBlock(world,weekend){
  const setup=weekend.playerStrategy.setup??{},plan=weekend.playerStrategy.racePlan?.default??{};
  return `${pageHead("Setup y estrategia", "Controles grandes para tocar con el pulgar")}
  <article class="card rw-setup-card">
    <div class="grid three mobile-form-grid">
      <label class="form-row"><span>Carga aero</span><select id="rw-aero">${option("low","Baja",setup.aeroLevel)}${option("medium","Media",setup.aeroLevel)}${option("high","Alta",setup.aeroLevel)}</select></label>
      <label class="form-row"><span>Suspensión</span><select id="rw-suspension">${option("soft","Blanda",setup.suspension)}${option("balanced","Balanceada",setup.suspension)}${option("stiff","Rígida",setup.suspension)}</select></label>
      <label class="form-row"><span>Frenos</span><select id="rw-brakes">${option("conservative","Conservador",setup.brakeBias)}${option("balanced","Balanceado",setup.brakeBias)}${option("aggressive","Agresivo",setup.brakeBias)}</select></label>
      <label class="form-row"><span>Motor</span><select id="rw-engine">${option("conservative","Conservador",setup.engineMode)}${option("normal","Normal",setup.engineMode)}${option("aggressive","Agresivo",setup.engineMode)}</select></label>
      <label class="form-row"><span>Programa</span><select id="rw-program">${option("qualifying","Qualy",weekend.playerStrategy.practiceProgram)}${option("long_run","Carrera",weekend.playerStrategy.practiceProgram)}${option("tyres","Neumáticos",weekend.playerStrategy.practiceProgram)}${option("balance","Balance",weekend.playerStrategy.practiceProgram)}</select></label>
      <label class="form-row"><span>Riesgo</span><select id="rw-risk">${option("low","Bajo",weekend.playerStrategy.practiceRisk)}${option("medium","Medio",weekend.playerStrategy.practiceRisk)}${option("high","Alto",weekend.playerStrategy.practiceRisk)}</select></label>
    </div>
    <div class="grid three mobile-form-grid">
      <label class="form-row"><span>Neumático inicial</span><select id="rw-start-tyre">${Object.entries(TYRE_COMPOUNDS).map(([id,t])=>option(id,t.name,plan.startTyre)).join("")}</select></label>
      <label class="form-row"><span>Ritmo inicial</span><select id="rw-pace">${option("push","Atacar",plan.pace)}${option("balanced","Balanceado",plan.pace)}${option("conserve","Conservar",plan.pace)}</select></label>
      <label class="form-row"><span>Plan carrera</span><select id="rw-plan">${option("attack","Atacar",plan.mode)}${option("defend","Defender",plan.mode)}${option("plan_b","Plan B",plan.mode)}</select></label>
    </div>
    <div class="actions"><button class="button primary" data-action="apply-weekend-setup">Aplicar setup</button><button class="button" data-action="run-practice" ${!["setup","practice"].includes(weekend.stage)?"disabled":""}>Correr práctica</button></div>
  </article>`;
}

function practiceBlock(world,weekend){
  const sessions=Object.entries(weekend.sessions).filter(([,s])=>s.type==="practice");
  const cards=sessions.flatMap(([key,s])=>s.results.filter(r=>r.teamId===world.userTeamId).map(r=>({key,s,r})));
  return `${pageHead("Prácticas", "Feedback accionable del ingeniero")}
  <div class="mobile-card-list practice-feedback-cards">${cards.map(({key,s,r})=>`<article class="card"><span class="pill info">${sessionLabel[key]??key} · P${r.position}</span><h3>${getDriver(world,r.driverId)?.name}</h3><p><strong>Comentario:</strong> ${r.feedback}</p><p><strong>Problema detectado:</strong> Setup ${r.setupQuality}/100 · desgaste ${r.tyreWear}</p><p><strong>Recomendación del ingeniero:</strong> ${r.recommendation??"Mantener plan y comparar datos."}</p></article>`).join("")||`<article class="card notice">Todavía no corriste prácticas.</article>`}</div>`;
}

function qualifyingBlock(world,weekend){
  const s=weekend.sessions.qualifying;
  if(!s)return `${pageHead("Qualy", "Lista compacta")}<article class="card notice">La clasificación todavía no se corrió.</article>`;
  return `${pageHead("Qualy",`${s.format} · ${weatherLabel(s.weather)}`)}
  <div class="qualy-compact-list">${s.results.map(r=>`<article class="card"><b>P${r.position}</b><span>${compactName(getDriver(world,r.driverId)?.name)}</span><strong>${getTeam(world,r.teamId)?.shortName??"—"}</strong></article>`).join("")}</div>
  <div class="table-wrap rw-desktop-table"><table class="data-table"><thead><tr><th>Pos</th><th>Piloto</th><th>Equipo</th><th>Tráfico</th><th>Error</th></tr></thead><tbody>${s.results.map(r=>`<tr><td class="pos">${r.position}</td><td>${getDriver(world,r.driverId)?.name}</td><td>${teamChip(getTeam(world,r.teamId))}</td><td>${r.traffic?"Sí":"—"}</td><td>${r.error?"Sí":"—"}</td></tr>`).join("")}</tbody></table></div>`;
}

function raceBlock(world,weekend){
  const team=userTeam(world),s=weekend.sessions.race,plan=weekend.playerStrategy.racePlan?.default??{};
  const driverCards=(team.drivers??[]).map(id=>{
    const driver=getDriver(world,id),result=s?.results?.find(r=>r.driverId===id),last=s?.segments?.at(-1)?.positions?.find(p=>p.driverId===id);
    return `<article class="card race-driver-control"><span class="pill">${driver?.name}</span><h3>${result?`P${result.position}`:"Plan pendiente"}</h3><div class="mobile-stat-grid"><span>Neumático <b>${result?.tyresUsed?.at(-1)??plan.startTyre??"medium"}</b></span><span>Desgaste <b>${last?.wear??"—"}</b></span><span>Ritmo <b>${plan.pace??"balanced"}</b></span><span>Ventana <b>Pit</b></span></div><p>Plan activo: <strong>${plan.mode??"attack"}</strong> · Paradas ${result?.pits??0}</p><div class="race-command-row"><button class="button">Atacar</button><button class="button">Conservar</button><button class="button">Box</button><button class="button">Defender</button><button class="button">Plan B</button></div></article>`;
  }).join("");
  if(!s)return `${pageHead("Carrera", "Estrategia pre-carrera por piloto")}<div class="grid two">${driverCards}</div>`;
  return `${pageHead("Carrera",`${weatherLabel(s.weather)} · ${s.events.length} eventos`)}<div class="grid two">${driverCards}</div><div class="grid two"><article class="card"><h3>Eventos</h3>${s.events.map(e=>`<div class="standing-line"><b>${e.segment}</b><span>${e.message??e.description??e.type}</span><strong>${e.type}</strong></div>`).join("")||`<p>Sin eventos relevantes.</p>`}</article><article class="card"><h3>Clasificación completa</h3>${s.results.map(r=>`<div class="standing-line"><b>P${r.position}</b><span>${getDriver(world,r.driverId)?.name}</span><strong>${r.retired?`DNF · ${r.cause??"Retirado"}`:`${r.points} pts`}</strong></div>`).join("")}</article></div>`;
}
