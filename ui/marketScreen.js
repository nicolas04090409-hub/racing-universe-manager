import { calculateDriverInterest } from "../engine/negotiationEngine.js";
import { contractStatus, roleLabels } from "../engine/contractEngine.js";
import { driverOverall,getTeam,money,pageHead,potentialSummary,teamChip,userTeam } from "./helpers.js";

const option=(value,label,current)=>`<option value="${value}" ${current===value?"selected":""}>${label}</option>`;
function applies(d,f,season){
  if(f.category!=="all"&&d.categoryId!==f.category)return false;
  if(f.academy!=="all"&&d.academyId!==f.academy)return false;
  if(f.potential!=="all"&&(d.potentialStarsVisible??0)<Number(f.potential))return false;
  if(f.ca!=="all"&&(d.currentAbility??0)<Number(f.ca))return false;
  if(f.age!=="all"&&d.age>Number(f.age))return false;
  if(f.contract==="free"&&d.teamId)return false;
  if(f.contract==="expiring"&&d.contractUntil>season+1)return false;
  return true;
}

function defaultOfferFor(driver){
  return{salary:Math.round((driver.salary??0)*1.08),duration:2,role:driver.currentAbility>=82?"lead_driver":driver.age<=21?"junior_driver":"second_driver",signingBonus:Math.round((driver.salary??0)*.25),releaseClause:driver.releaseClause||Math.round((driver.marketValue??driver.salary*5)*1.4),optionYears:driver.age<=23?1:0};
}

export function renderMarketScreen(world,data,filters){
  const team=userTeam(world),category=world.categories.find(c=>c.id===team.categoryId);
  const candidates=world.drivers.filter(d=>!d.retired&&d.teamId!==team.id&&applies(d,filters,world.currentSeason)).sort((a,b)=>driverOverall(b)-driverOverall(a));
  const filter=(key,label,values)=>`<label class="scout-filter"><span>${label}</span><select data-market-filter="${key}">${values.map(v=>option(v[0],v[1],filters[key])).join("")}</select></label>`;
  const rows=candidates.map(driver=>{
    const driverCategory=world.categories.find(c=>c.id===driver.categoryId),academy=data.academies.find(a=>a.id===driver.academyId),status=contractStatus(driver,world.currentSeason);
    const offer=defaultOfferFor(driver),interest=calculateDriverInterest(driver,team,category,offer,world),pot=potentialSummary(driver,getTeam(world,driver.teamId));
    return {driver,driverCategory,academy,status,interest,pot};
  });
  return`${pageHead("Scouting y mercado",`${candidates.length} perfiles · Presupuesto ${money(team.budget)} · Salarios ${money(team.salaryCommitted??0)}`)}
  <details class="mobile-filter-panel" open><summary>Filtros de mercado</summary><div class="scouting-toolbar">${filter("category","Categoría",[["all","Todas"],...world.categories.map(c=>[c.id,c.shortName])])}${filter("academy","Academia",[["all","Todas"],...data.academies.map(a=>[a.id,a.name])])}${filter("potential","Potencial",[["all","Todo"],["5","5 estrellas"],["4","4+ estrellas"],["3","3+ estrellas"]])}${filter("ca","CA mínima",[["all","Sin mínimo"],["85","85+"],["80","80+"],["75","75+"],["70","70+"]])}${filter("age","Edad",[["all","Todas"],["18","Sub-18"],["21","Sub-21"],["25","Sub-25"]])}${filter("contract","Contrato",[["all","Todos"],["free","Libres"],["expiring","Por vencer"]])}</div></details>
  <div class="mobile-card-list market-mobile-list">${rows.slice(0,20).map(({driver,driverCategory,status,interest,pot})=>`<article class="card market-mobile-card"><div class="card-title-row"><div><span class="pill ${status.tone}">${status.label}</span><h3>${driver.name}</h3><p>${driverCategory?.shortName??"Libre"} · ${teamChip(getTeam(world,driver.teamId))}</p></div><strong>${driverOverall(driver)} CA</strong></div><div class="mobile-stat-grid"><span>Edad <b>${driver.age}</b></span><span>Potencial <b>${pot.rating}</b></span><span>Salario <b>${money(driver.salary??0)}</b></span><span>Interés <b>${interest.score}/100</b></span></div><p>Contrato: ${driver.teamId?`hasta ${driver.contractUntil}`:"Libre"} · Valor ${money(driver.marketValue??0)}</p><div class="actions"><button class="button primary" data-action="open-offer" data-driver="${driver.id}">Negociar</button><button class="button" data-action="view-driver" data-driver="${driver.id}">Detalle</button></div></article>`).join("")||`<article class="card notice">No hay pilotos para esta combinación de filtros.</article>`}<p class="notice">Mobile muestra top 20 por rendimiento. Ajustá filtros antes de ampliar búsqueda.</p></div>
  <div class="table-wrap market-desktop-table"><table class="data-table market-table"><thead><tr><th>Nombre</th><th>Edad</th><th>Nac.</th><th>Categoría</th><th>Equipo</th><th>CA</th><th>Potencial visible</th><th>Academia</th><th>Contrato</th><th>Salario</th><th>Valor</th><th>Interés</th><th>Acción</th></tr></thead><tbody>${rows.map(({driver,driverCategory,academy,status,interest,pot})=>`<tr><td><button class="table-link" data-action="view-driver" data-driver="${driver.id}">${driver.name}</button></td><td>${driver.age}</td><td>${driver.countryCode??driver.nationality}</td><td>${driverCategory?.shortName??"Libre"}</td><td>${teamChip(getTeam(world,driver.teamId))}</td><td><strong class="rating-cell">${driverOverall(driver)}</strong></td><td><strong>${pot.rating}</strong><small class="muted">${pot.label} · ${pot.range}</small></td><td>${academy?.name??"Independiente"}</td><td><span class="pill ${status.tone}">${status.label}</span></td><td>${money(driver.salary??0)}</td><td>${money(driver.marketValue??0)}</td><td><strong>${interest.label}</strong><small class="muted">${interest.score}/100</small></td><td><button class="button small" data-action="open-offer" data-driver="${driver.id}">Enviar oferta</button></td></tr>`).join("")||`<tr><td colspan="13" class="empty-cell">No hay pilotos para esta combinación de filtros.</td></tr>`}</tbody></table></div>
  <p class="notice">Las ofertas no son instantáneas. El piloto puede aceptar, rechazar, pedir más salario/rol o esperar propuestas rivales.</p>`;
}

export function offerModal(world,driverId){
  const team=userTeam(world),driver=world.drivers.find(d=>d.id===driverId),category=world.categories.find(c=>c.id===team.categoryId);
  if(!driver)return"";
  const defaultOffer=defaultOfferFor(driver),interest=calculateDriverInterest(driver,team,category,defaultOffer,world);
  return`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="metric-label accent">OFERTA DE CONTRATO</div><h2>${driver.name}</h2><p class="muted">${team.name} · Interés estimado: ${interest.label} (${interest.score}/100)</p></div><button class="close" data-action="close-modal">×</button></div>
  <div class="grid two"><article class="card"><h3>Condiciones</h3><label class="form-row"><span>Salario anual</span><input id="offer-salary" type="number" min="0" value="${defaultOffer.salary}"></label><label class="form-row"><span>Duración</span><select id="offer-duration">${[1,2,3,4].map(y=>`<option value="${y}" ${y===defaultOffer.duration?"selected":""}>${y} año${y>1?"s":""}</option>`).join("")}</select></label><label class="form-row"><span>Rol prometido</span><select id="offer-role">${Object.entries(roleLabels).map(([value,label])=>`<option value="${value}" ${value===defaultOffer.role?"selected":""}>${label}</option>`).join("")}</select></label><label class="form-row"><span>Bono de firma</span><input id="offer-bonus" type="number" min="0" value="${defaultOffer.signingBonus}"></label><label class="form-row"><span>Cláusula de salida</span><input id="offer-clause" type="number" min="0" value="${defaultOffer.releaseClause}"></label><label class="form-row"><span>Opción de extensión</span><select id="offer-option">${[0,1,2].map(y=>`<option value="${y}" ${y===defaultOffer.optionYears?"selected":""}>${y} año${y!==1?"s":""}</option>`).join("")}</select></label><button class="button primary full" data-action="send-offer" data-driver="${driver.id}">Enviar oferta</button></article><article class="card"><h3>Lectura del piloto</h3><div class="interest-score"><strong>${interest.score}</strong><span>${interest.label}</span></div><div class="reason-list">${interest.reasons.map(reason=>`<p>${reason}</p>`).join("")}</div><div class="divider"></div><p>Salario actual: <strong>${money(driver.salary??0)}</strong></p><p>Valor de mercado: <strong>${money(driver.marketValue??0)}</strong></p><p>Contrato actual: <strong>${driver.teamId?`hasta ${driver.contractUntil}`:"libre"}</strong></p></article></div></div></div>`;
}
