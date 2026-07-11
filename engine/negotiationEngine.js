import { addNews, normalizeDriverContracts } from "./contractEngine.js";
import { syncTeamsAndDrivers } from "./syncEngine.js";

const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(value)));
const nowId=prefix=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const roleRank={reserve_driver:1,development_driver:2,pay_driver:2,junior_driver:3,second_driver:4,lead_driver:5};

function categoryLevel(world, categoryId){return world.categories.find(c=>c.id===categoryId)?.level??1;}
function driverRecentScore(world, driverId) {
  const standing=Object.values(world.categoryStates??{}).flatMap(s=>s.driverStandings??[]).find(r=>r.driverId===driverId);
  if (!standing) return 50;
  return clamp(78-standing.position*3+standing.points/10,25,95);
}

export function calculateDriverInterest(driver, team, category, offer, gameState) {
  normalizeDriverContracts(gameState);
  const currentTeam=gameState.teams.find(t=>t.id===driver.teamId);
  const currentCategory=gameState.categories.find(c=>c.id===driver.categoryId);
  const offeredSalary=Number(offer.salary ?? offer.annualSalary ?? driver.salary);
  const reasons=[];
  let score=45;
  const teamGap=(team.reputation??50)-(driver.reputation??50);
  score+=teamGap*.32;
  if (teamGap>=8) reasons.push("+ Tu equipo tiene buena reputación para su perfil.");
  if (teamGap<-12) reasons.push("- Cree que el equipo todavía no iguala su reputación.");
  const levelGap=categoryLevel(gameState,category.id)-categoryLevel(gameState,driver.categoryId);
  score+=levelGap*13;
  if (levelGap>0) reasons.push("+ La oferta mejora su categoría deportiva.");
  if (levelGap<0) reasons.push("- Quiere correr en una categoría superior.");
  const salaryGap=(offeredSalary-(driver.salary??0))/Math.max(1,driver.salary??1);
  score+=salaryGap*25;
  if (salaryGap>.18) reasons.push("+ El salario mejora claramente su contrato actual.");
  if (salaryGap<-.05) reasons.push("- El salario está por debajo de su expectativa.");
  const requestedRole=offer.role??"second_driver";
  const currentRole=driver.role??"second_driver";
  score+=(roleRank[requestedRole]-roleRank[currentRole])*4;
  if (roleRank[requestedRole]>roleRank[currentRole]) reasons.push("+ El rol prometido le da más peso dentro del equipo.");
  if (roleRank[requestedRole]<3 && (driver.currentAbility??0)>78) reasons.push("- Considera bajo el rol ofrecido.");
  if (team.academyId && team.academyId===driver.academyId) { score+=8; reasons.push("+ Hay afinidad de academia."); }
  if ((driver.age??25)<=22 && (driver.potentialAbilityMax??driver.potential??70)>=84) score+=category.level>=2?3:-8;
  if ((driver.age??25)>=34 && category.level<3) score-=6;
  score+=((driver.morale??70)-70)*.18+((driver.driverHappiness??70)-70)*.16;
  const performance=driverRecentScore(gameState,driver.id);
  score+=(performance-50)*.12;
  if (performance>=72) reasons.push("+ Su rendimiento reciente aumenta su ambición.");
  const competitorOffers=(gameState.negotiations??[]).filter(n=>n.driverId===driver.id&&n.status!=="rejected"&&n.status!=="expired"&&n.teamId!==team.id);
  if (competitorOffers.length) { score-=6+competitorOffers.length*4; reasons.push("- Tiene ofertas o rumores de equipos competidores."); }
  if (currentTeam?.id===team.id) { score+=12; reasons.push("+ Ya conoce la estructura del equipo."); }
  if (driver.contractStatus==="free_agent") { score+=8; reasons.push("+ Está libre y busca asiento."); }
  if (driver.contractUntil<=gameState.currentSeason+1) score+=5;
  else if ((driver.currentAbility??0)>=86 || (driver.reputation??0)>=82) { score-=18; reasons.push("- Es una figura con contrato vigente y alta retención."); }
  if ((driver.driverHappiness??70)<45) { score+=8; reasons.push("+ La relación actual abre una puerta de salida."); }
  if (driver.retired || driver.contractStatus==="retiring") score=0;
  score=clamp(score);
  const label=score>=82?"Muy interesado":score>=65?"Interesado":score>=48?"Dudoso":score>=28?"Poco interesado":"No interesado";
  if (!reasons.length) reasons.push(score>=55?"+ La oferta encaja razonablemente con su carrera.":"- Necesita una propuesta más convincente.");
  return {score,label,reasons};
}

function offerCost(offer){return Number(offer.signingBonus??0)+Number(offer.salary??0);}

export function createPlayerOffer(world, driverId, offerInput={}) {
  normalizeDriverContracts(world);
  const team=world.teams.find(t=>t.id===world.userTeamId);
  const driver=world.drivers.find(d=>d.id===driverId&&!d.retired);
  if (!team||!driver) return {ok:false,message:"No se puede preparar la oferta."};
  const category=world.categories.find(c=>c.id===team.categoryId);
  const offer={
    salary:Math.max(0,Math.round(Number(offerInput.salary??driver.salary*1.08))),
    duration:Math.max(1,Math.min(4,Number(offerInput.duration??2))),
    role:offerInput.role??(driver.currentAbility>=82?"lead_driver":driver.age<=21?"junior_driver":"second_driver"),
    signingBonus:Math.max(0,Math.round(Number(offerInput.signingBonus??driver.salary*.25))),
    releaseClause:Math.max(0,Math.round(Number(offerInput.releaseClause??(driver.releaseClause||driver.marketValue*1.4||driver.salary*6)))),
    optionYears:Math.max(0,Math.min(2,Number(offerInput.optionYears??(driver.age<=23?1:0))))
  };
  const totalCommitment=offer.signingBonus+offer.salary;
  if (team.budget < totalCommitment) return {ok:false,message:"El presupuesto no alcanza para bono y primer salario."};
  const interest=calculateDriverInterest(driver,team,category,offer,world);
  world.negotiations??=[];
  const existing=world.negotiations.find(n=>n.driverId===driver.id&&n.teamId===team.id&&["draft","sent","counter"].includes(n.status));
  if (existing) return {ok:false,message:"Ya hay una negociación abierta con este piloto."};
  const negotiation={id:nowId("neg"),type:"player",driverId:driver.id,teamId:team.id,categoryId:team.categoryId,offer,status:"sent",createdSeason:world.currentSeason,createdRound:world.categoryStates?.[team.categoryId]?.currentRound??1,responseDueRound:(world.categoryStates?.[team.categoryId]?.currentRound??1)+1,interest,history:[{status:"sent",message:`Oferta enviada a ${driver.name}.`}],competingTeams:[]};
  world.negotiations.unshift(negotiation);
  driver.negotiationStatus="in_negotiation";
  driver.contractStatus=driver.contractStatus==="free_agent"?"in_negotiation":driver.contractStatus;
  addNews(world,"Oferta enviada",`${team.name} presentó una oferta por ${driver.name}.`,"info");
  return {ok:true,message:`Oferta enviada. Interés: ${interest.label}.`,negotiation};
}

export function processPlayerNegotiations(world) {
  normalizeDriverContracts(world);
  const updates=[];
  for (const negotiation of (world.negotiations??[]).filter(n=>n.type==="player"&&["sent","counter"].includes(n.status))) {
    const driver=world.drivers.find(d=>d.id===negotiation.driverId),team=world.teams.find(t=>t.id===negotiation.teamId),category=world.categories.find(c=>c.id===negotiation.categoryId);
    if (!driver||!team||!category) { negotiation.status="expired"; continue; }
    const interest=calculateDriverInterest(driver,team,category,negotiation.offer,world);
    negotiation.interest=interest;
    const roll=Math.random()*100;
    if (interest.score>=76 || (interest.score>=63&&roll<45)) {
      negotiation.status="accepted";
      negotiation.history.push({status:"accepted",message:`${driver.name} aceptó la oferta.`});
      addNews(world,"Oferta aceptada",`${driver.name} aceptó negociar su llegada a ${team.name}.`,"positive");
      updates.push({negotiation,accepted:true});
    } else if (interest.score>=46) {
      negotiation.status="counter";
      negotiation.offer.salary=Math.round(negotiation.offer.salary*(1.08+(70-interest.score)/250));
      negotiation.offer.signingBonus=Math.round(negotiation.offer.signingBonus*1.12);
      negotiation.history.push({status:"counter",message:`${driver.name} pidió mejores condiciones.`});
      addNews(world,"Contrapropuesta",`${driver.name} pide más salario o un rol mejor para firmar con ${team.name}.`,"warning");
      updates.push({negotiation,counter:true});
    } else if (interest.score>=30 && roll<45) {
      negotiation.status="waiting";
      negotiation.history.push({status:"waiting",message:`${driver.name} quiere esperar otras ofertas.`});
      addNews(world,"Decisión aplazada",`${driver.name} quiere esperar antes de responder a ${team.name}.`,"warning");
      updates.push({negotiation,waiting:true});
    } else {
      negotiation.status="rejected";
      negotiation.history.push({status:"rejected",message:`${driver.name} rechazó la oferta.`});
      driver.negotiationStatus="none";
      addNews(world,"Oferta rechazada",`${driver.name} rechazó una primera oferta de ${team.name}.`,"warning");
      updates.push({negotiation,rejected:true});
    }
  }
  return updates;
}

export function finalizeAcceptedNegotiation(world, negotiationId, replaceDriverId=null) {
  normalizeDriverContracts(world);
  const negotiation=(world.negotiations??[]).find(n=>n.id===negotiationId&&n.status==="accepted");
  if (!negotiation) return {ok:false,message:"No hay una oferta aceptada para cerrar."};
  const team=world.teams.find(t=>t.id===negotiation.teamId),driver=world.drivers.find(d=>d.id===negotiation.driverId);
  if (!team||!driver) return {ok:false,message:"Negociación inválida."};
  const cost=offerCost(negotiation.offer);
  if (team.budget<cost) return {ok:false,message:"El presupuesto ya no alcanza para cerrar el contrato."};
  const slots=world.categories.find(c=>c.id===team.categoryId)?.driversPerTeam??2;
  let replaced=replaceDriverId?world.drivers.find(d=>d.id===replaceDriverId&&d.teamId===team.id):null;
  if (!replaced && team.drivers.length>=slots) replaced=team.drivers.map(id=>world.drivers.find(d=>d.id===id)).filter(Boolean).sort((a,b)=>(a.currentAbility??60)-(b.currentAbility??60))[0];
  if (replaced) {
    replaced.teamId=null; replaced.categoryId="free_agents"; replaced.contractUntil=world.currentSeason; replaced.contractStatus="free_agent"; replaced.negotiationStatus="none"; replaced.driverHappiness=Math.max(35,(replaced.driverHappiness??70)-15);
    team.drivers=team.drivers.filter(id=>id!==replaced.id);
  }
  const oldTeam=world.teams.find(t=>t.id===driver.teamId);
  if (oldTeam) oldTeam.drivers=oldTeam.drivers.filter(id=>id!==driver.id);
  team.budget-=cost;
  driver.teamId=team.id;
  driver.categoryId=team.categoryId;
  driver.salary=negotiation.offer.salary;
  driver.contractUntil=world.currentSeason+negotiation.offer.duration;
  driver.contractValue=driver.salary*negotiation.offer.duration;
  driver.releaseClause=negotiation.offer.releaseClause;
  driver.optionYears=negotiation.offer.optionYears;
  driver.role=negotiation.offer.role;
  driver.contractStatus="signed";
  driver.negotiationStatus="none";
  driver.driverHappiness=Math.min(100,(driver.driverHappiness??70)+10);
  team.drivers.push(driver.id);
  negotiation.status="signed";
  syncTeamsAndDrivers(world);
  normalizeDriverContracts(world);
  addNews(world,"Contrato firmado",`${driver.name} firma con ${team.name} hasta ${driver.contractUntil}.`,"positive");
  return {ok:true,message:`${driver.name} firmó con ${team.name}.`,replaced};
}

export function withdrawNegotiation(world, negotiationId) {
  const negotiation=(world.negotiations??[]).find(n=>n.id===negotiationId&&["sent","counter","waiting"].includes(n.status));
  if (!negotiation) return {ok:false,message:"No se puede retirar esta negociación."};
  negotiation.status="withdrawn";
  const driver=world.drivers.find(d=>d.id===negotiation.driverId);
  if (driver) driver.negotiationStatus="none";
  return {ok:true,message:"Oferta retirada."};
}
