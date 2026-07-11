import { roleLabels } from "../engine/contractEngine.js";
import { clampNumber, formatMoneyCompact, getDriver, getTeam, interestTone, money, pageHead, teamChip, userTeam } from "./helpers.js";

const statusLabel={draft:"Borrador",sent:"Enviada",counter:"Contrapropuesta",accepted:"Aceptada",rejected:"Rechazada",expired:"Expirada",withdrawn:"Retirada",waiting:"Esperando",signed:"Firmada"};
const statusTone={accepted:"good",signed:"good",counter:"warn",waiting:"warn",rejected:"bad",expired:"bad",withdrawn:"bad",sent:""};
const safeInterest=interest=>interest?{score:Math.round(clampNumber(interest.score,0,100)),label:interest.label??"No interesado"}:null;

export function renderNegotiationsScreen(world){
  const team=userTeam(world),items=[...(world.negotiations??[])].sort((a,b)=>(b.createdSeason-a.createdSeason)||((b.createdRound??0)-(a.createdRound??0)));
  const active=items.filter(n=>["sent","counter","accepted","waiting"].includes(n.status)).length;
  return`${pageHead("Negociaciones",`${active} abiertas · Mercado de pilotos · Presupuesto ${money(team.budget)}`)}
  <div class="table-wrap"><table class="data-table negotiation-table"><thead><tr><th>Piloto</th><th>Equipo interesado</th><th>Oferta</th><th>Estado</th><th>Respuesta esperada</th><th>Acciones</th></tr></thead><tbody>${items.map(n=>{
    const driver=getDriver(world,n.driverId),offer=n.offer??{},interestedTeam=getTeam(world,n.teamId),state=statusLabel[n.status]??n.status,interest=safeInterest(n.interest);
    return`<tr><td><button class="table-link" data-action="view-driver" data-driver="${driver?.id}">${driver?.name??"Piloto"}</button></td><td>${teamChip(interestedTeam)}${n.type==="ai"?`<small class="muted">IA</small>`:`<small class="muted">Jugador</small>`}</td><td><strong>${formatMoneyCompact(offer.salary??0)}</strong><small class="muted">${offer.duration??1} años · ${roleLabels[offer.role]??offer.role} · bono ${formatMoneyCompact(offer.signingBonus??0)}</small></td><td><span class="pill ${statusTone[n.status]??""}">${state}</span>${interest?`<small class="muted"><span class="pill ${interestTone(interest.score)}">${interest.label}</span> ${interest.score}/100</small>`:""}</td><td>Ronda ${n.responseDueRound??"—"}<small class="muted">${n.history?.at(-1)?.message??""}</small></td><td><div class="actions">${n.type==="player"&&n.status==="accepted"?`<button class="button small primary" data-action="finalize-offer" data-negotiation="${n.id}">Firmar</button>`:""}${n.type==="player"&&["sent","counter","waiting"].includes(n.status)?`<button class="button small danger" data-action="withdraw-offer" data-negotiation="${n.id}">Retirar</button>`:""}${n.type==="player"&&n.status==="counter"?`<button class="button small" data-action="improve-offer" data-negotiation="${n.id}">Aceptar contraoferta</button>`:""}</div></td></tr>`;
  }).join("")||`<tr><td colspan="6" class="empty-cell">Todavía no hay negociaciones. Abrí el Mercado y enviá una oferta.</td></tr>`}</tbody></table></div>
  <p class="notice">Las ofertas se procesan al avanzar carreras o fines de semana. Los equipos IA también pueden competir por el mismo piloto.</p>`;
}
