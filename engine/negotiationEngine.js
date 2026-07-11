import { addNews, normalizeDriverContracts } from "./contractEngine.js";
import { syncTeamsAndDrivers } from "./syncEngine.js";

const safeNumber=(value,fallback=0)=>{const number=Number(value);return Number.isFinite(number)?number:fallback;};
const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(safeNumber(value,min))));
const nowId=prefix=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const roleRank={reserve_driver:1,development_driver:2,pay_driver:2,junior_driver:3,second_driver:4,lead_driver:5,star_driver:6};

function categoryLevel(world, categoryId){return safeNumber(world?.categories?.find(c=>c.id===categoryId)?.level,categoryId==="free_agents"?0:1);}
function interestLabel(score){
  const value=clamp(score);
  if(value>=85)return"Muy interesado";
  if(value>=70)return"Interesado";
  if(value>=55)return"Escuchará una oferta";
  if(value>=40)return"Difícil";
  if(value>=20)return"Muy difícil";
  return"No interesado";
}
function driverRecentScore(world, driverId) {
  const standing=Object.values(world?.categoryStates??{}).flatMap(s=>s.driverStandings??[]).find(r=>r.driverId===driverId);
  if (!standing) return 50;
  return clamp(78-safeNumber(standing.position,12)*3+safeNumber(standing.points,0)/10,25,95);
}
function offerCost(offer){return safeNumber(offer?.signingBonus,0)+safeNumber(offer?.salary,0);}

export function calculateDriverInterest(driver={}, team={}, category={}, offer={}, gameState={}) {
  if (gameState?.drivers) normalizeDriverContracts(gameState);
  const reasons=[];
  const currentTeam=gameState?.teams?.find(t=>t.id===driver.teamId);
  const currentCategory=gameState?.categories?.find(c=>c.id===driver.categoryId);
  const targetCategory=category??gameState?.categories?.find(c=>c.id===team.categoryId)??{};
  const currentSalary=Math.max(1,safeNumber(driver.salary,Math.max(100000,safeNumber(driver.currentAbility,65)**3*25)));
  const offeredSalary=Math.max(0,safeNumber(offer.salary??offer.annualSalary,currentSalary*1.08));
  const teamRep=safeNumber(team.reputation,55);
  const driverRep=safeNumber(driver.reputation,driver.currentAbility??65);
  const driverRating=safeNumber(driver.currentAbility,driverRep);
  const targetLevel=safeNumber(targetCategory.level,categoryLevel(gameState,team.categoryId));
  const currentLevel=safeNumber(currentCategory?.level,categoryLevel(gameState,driver.categoryId));
  const isFree=!driver.teamId||driver.categoryId==="free_agents"||driver.contractStatus==="free_agent";
  const yearsLeft=Math.max(0,safeNumber(driver.contractUntil,gameState.currentSeason)-safeNumber(gameState.currentSeason,2026));
  const requestedRole=offer.role??"second_driver";
  const currentRole=driver.role??"second_driver";

  let score=42;

  const teamGap=teamRep-driverRep;
  score+=teamGap*.38;
  if(teamRep>=86&&targetLevel>=3){score+=18;reasons.push("+ Proyecto top de categoría máxima: propuesta muy atractiva.");}
  else if(teamRep>=76){score+=9;reasons.push("+ La reputación del equipo abre una oportunidad seria.");}
  else if(teamGap<-14){reasons.push("- Cree que el equipo todavía no iguala su reputación.");}

  const levelGap=targetLevel-currentLevel;
  if(levelGap>0){score+=Math.min(28,levelGap*18);reasons.push("+ La oferta mejora su categoría deportiva.");}
  if(levelGap<0){score-=Math.min(34,Math.abs(levelGap)*24);reasons.push("- Quiere correr en una categoría superior.");}
  if(isFree){score+=18;reasons.push("+ Está libre y busca asiento competitivo.");}

  const salaryGap=(offeredSalary-currentSalary)/currentSalary;
  score+=Math.max(-28,Math.min(24,salaryGap*58));
  if(salaryGap>.18)reasons.push("+ El salario mejora claramente su contrato actual.");
  if(salaryGap<-.05)reasons.push("- El salario está por debajo de su expectativa.");

  const roleDelta=(roleRank[requestedRole]??4)-(roleRank[currentRole]??4);
  score+=roleDelta*5;
  if(roleDelta>0)reasons.push("+ El rol prometido le da más peso dentro del equipo.");
  if((roleRank[requestedRole]??4)<3&&driverRating>78){score-=8;reasons.push("- Considera bajo el rol ofrecido.");}

  if(team.academyId&&team.academyId===driver.academyId){score+=8;reasons.push("+ Hay afinidad de academia.");}
  if((driver.age??25)<=22&&(driver.potentialAbilityMax??driver.potential??70)>=84){
    if(targetLevel>=3&&teamRep>=82){score+=2;reasons.push("+ El salto es grande, pero el entorno puede desarrollar su potencial.");}
    else if(targetLevel>=currentLevel){score+=7;reasons.push("+ Ve minutos reales para crecer.");}
    else score-=8;
  }
  if((driver.age??25)>=34&&targetLevel<3)score-=6;

  score+=(safeNumber(driver.morale,70)-70)*.18+(safeNumber(driver.driverHappiness,70)-70)*.22;
  const performance=driverRecentScore(gameState,driver.id);
  score+=(performance-50)*.12;
  if(performance>=72)reasons.push("+ Su rendimiento reciente aumenta su ambición.");

  const competitorOffers=(gameState.negotiations??[]).filter(n=>n.driverId===driver.id&&n.status!=="rejected"&&n.status!=="expired"&&n.teamId!==team.id);
  if(competitorOffers.length){score-=6+competitorOffers.length*4;reasons.push("- Tiene ofertas o rumores de equipos competidores.");}
  if(currentTeam?.id===team.id){score+=12;reasons.push("+ Ya conoce la estructura del equipo.");}

  if(!isFree&&yearsLeft>1){
    const retention=(driverRating>=86||driverRep>=82)?20:10;
    score-=Math.min(30,retention+yearsLeft*4);
    reasons.push("- Tiene contrato vigente y su equipo intentará retenerlo.");
  } else if(!isFree&&yearsLeft<=1) {
    score+=7;
    reasons.push("+ Su contrato está cerca de vencer.");
  }
  if(safeNumber(driver.driverHappiness,70)<45){score+=10;reasons.push("+ La relación actual abre una puerta de salida.");}
  if(driver.retired||driver.contractStatus==="retiring")score=0;

  score=clamp(score);
  if(!reasons.length)reasons.push(score>=55?"+ La oferta encaja razonablemente con su carrera.":"- Necesita una propuesta más convincente.");
  return {score,label:interestLabel(score),reasons};
}

export function createPlayerOffer(world, driverId, offerInput={}) {
  normalizeDriverContracts(world);
  const team=world.teams.find(t=>t.id===world.userTeamId);
  const driver=world.drivers.find(d=>d.id===driverId&&!d.retired);
  if (!team||!driver) return {ok:false,message:"No se puede preparar la oferta."};
  const category=world.categories.find(c=>c.id===team.categoryId);
  const baseSalary=Math.max(50000,safeNumber(driver.salary,(safeNumber(driver.currentAbility,65)**3)*30));
  const offer={
    salary:Math.max(0,Math.round(safeNumber(offerInput.salary,baseSalary*1.08))),
    duration:Math.max(1,Math.min(4,Math.round(safeNumber(offerInput.duration,2)))),
    role:offerInput.role??(safeNumber(driver.currentAbility,65)>=82?"lead_driver":safeNumber(driver.age,24)<=21?"junior_driver":"second_driver"),
    signingBonus:Math.max(0,Math.round(safeNumber(offerInput.signingBonus,baseSalary*.25))),
    releaseClause:Math.max(0,Math.round(safeNumber(offerInput.releaseClause,driver.releaseClause||safeNumber(driver.marketValue,baseSalary*5)*1.4||baseSalary*6))),
    optionYears:Math.max(0,Math.min(2,Math.round(safeNumber(offerInput.optionYears,safeNumber(driver.age,24)<=23?1:0))))
  };
  const totalCommitment=offer.signingBonus+offer.salary;
  if (safeNumber(team.budget,0) < totalCommitment) return {ok:false,message:"El presupuesto no alcanza para bono y primer salario."};
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
      negotiation.offer.salary=Math.round(safeNumber(negotiation.offer.salary,0)*(1.08+(70-interest.score)/250));
      negotiation.offer.signingBonus=Math.round(safeNumber(negotiation.offer.signingBonus,0)*1.12);
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
  if (safeNumber(team.budget,0)<cost) return {ok:false,message:"El presupuesto ya no alcanza para cerrar el contrato."};
  const slots=world.categories.find(c=>c.id===team.categoryId)?.driversPerTeam??2;
  let replaced=replaceDriverId?world.drivers.find(d=>d.id===replaceDriverId&&d.teamId===team.id):null;
  if (!replaced && team.drivers.length>=slots) replaced=team.drivers.map(id=>world.drivers.find(d=>d.id===id)).filter(Boolean).sort((a,b)=>safeNumber(a.currentAbility,60)-safeNumber(b.currentAbility,60))[0];
  if (replaced) {
    replaced.teamId=null; replaced.categoryId="free_agents"; replaced.contractUntil=world.currentSeason; replaced.contractStatus="free_agent"; replaced.negotiationStatus="none"; replaced.driverHappiness=Math.max(35,safeNumber(replaced.driverHappiness,70)-15);
    team.drivers=team.drivers.filter(id=>id!==replaced.id);
  }
  const oldTeam=world.teams.find(t=>t.id===driver.teamId);
  if (oldTeam) oldTeam.drivers=oldTeam.drivers.filter(id=>id!==driver.id);
  team.budget=safeNumber(team.budget,0)-cost;
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
  driver.driverHappiness=Math.min(100,safeNumber(driver.driverHappiness,70)+10);
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
