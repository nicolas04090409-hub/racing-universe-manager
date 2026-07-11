import { facilityBenefits,facilityLabels,facilityQuote } from "../engine/developmentEngine.js";
import { money,pageHead,progress,userTeam } from "./helpers.js";

export function renderFacilitiesScreen(world){
  const team=userTeam(world),projects=(world.facilityProjects??[]).filter(p=>p.teamId===team.id),facilities=Object.entries(team.facilities??{});
  return`${pageHead("Instalaciones",`${team.name} · Nivel global ${team.facilitiesLevel}`)}
  ${pageHead("Obras activas",`${projects.filter(p=>p.status==="active").length} en construcción`)}
  <div class="grid two">${projects.map(p=>`<article class="card"><div class="card-title-row"><div><span class="pill ${p.status==="completed"?"good":"info"}">${p.status}</span><h3>${facilityLabels[p.facility]}</h3><p>Objetivo: nivel ${p.targetLevel} · ${money(p.cost)}</p></div><strong>${Math.round(p.progress)}%</strong></div>${progress("Progreso",p.progress,"blue")}</article>`).join("")||`<article class="card notice">No hay obras activas.</article>`}</div>
  ${pageHead("Mapa de instalaciones","Cada nivel impacta staff, I+D, sponsors, fitness o estrategia")}
  <div class="facility-map">${facilities.map(([facility,level],index)=>{const quote=facilityQuote(team,facility),active=projects.some(p=>p.facility===facility&&["planned","active"].includes(p.status));return`<article class="card facility-card"><div class="facility-icon">${String(index+1).padStart(2,"0")}</div><div><span class="pill">NIVEL ${level}/10</span><h3>${facilityLabels[facility]??facility}</h3><p>${facilityBenefits[facility]??"Impacto operativo"}</p>${progress("Nivel",level*10,"blue")}<button class="button full" data-action="start-facility" data-facility="${facility}" ${level>=10||team.budget<quote.cost||active?"disabled":""}>Mejorar a ${quote.targetLevel} · ${money(quote.cost)}</button><small class="locked-note">${quote.durationWeeks} semanas</small></div></article>`}).join("")}</div>`;
}
