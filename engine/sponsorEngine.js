import { addUniverseNews } from "./newsEngine.js";
import { updateWorldFinances } from "./economyEngine.js";

const safeNumber=(value,fallback=0)=>{const number=Number(value);return Number.isFinite(number)?number:fallback;};
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(safeNumber(v,min))));
const id=prefix=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;

export function formatSponsorRequirement(requirement){
  return ({
    high_marketability_driver:"Piloto con alto atractivo comercial",
    national_driver:"Piloto de nacionalidad estratégica",
    top_3_team:"Equipo top 3",
    rookie_driver:"Rookie/promesa",
    championship_contender:"Candidato al campeonato",
    budget_team:"Equipo eficiente en costos",
    manufacturer_project:"Proyecto de fabricante",
    youth_development:"Desarrollo de jóvenes",
    technical_excellence:"Excelencia técnica"
  })[requirement]??String(requirement).replaceAll("_"," ");
}

export function evaluateSponsorInterest(sponsor, team, world) {
  let score=35+safeNumber(team.reputation,50)*.35+(safeNumber(team.finances?.projectedBalance,0)>0?8:-8);
  if(sponsor.preferredCategories?.includes(team.categoryId))score+=16;
  const drivers=(team.drivers??[]).map(id=>world.drivers.find(d=>d.id===id)).filter(Boolean);
  for(const req of sponsor.requirements??[]){
    if(req==="high_marketability_driver"&&drivers.some(d=>safeNumber(d.marketability,0)>80))score+=12;
    if(req==="rookie_driver"&&drivers.some(d=>safeNumber(d.age,99)<=21))score+=10;
    if(req==="national_driver")score+=4;
    if(req==="championship_contender"&&safeNumber(team.reputation,0)>84)score+=14;
    if(req==="budget_team"&&safeNumber(team.reputation,0)<78)score+=10;
    if(req==="top_3_team"&&safeNumber(team.reputation,0)>86)score+=12;
  }
  for(const philosophy of sponsor.preferredTeamPhilosophies??[])if(philosophy===team.teamPhilosophy)score+=10;
  for(const nationality of sponsor.preferredDriverNationalities??[])if(drivers.some(d=>d.nationality===nationality||d.countryCode===nationality))score+=12;
  for(const region of sponsor.preferredRegions??[])if(drivers.some(d=>safeNumber(d.fanbase?.regions?.[region],0)>60))score+=6;
  return clamp(score);
}

export function sendSponsorProposal(world, sponsorId) {
  const team=world.teams.find(t=>t.id===world.userTeamId),sponsor=world.sponsors?.find(s=>s.id===sponsorId);
  if(!team||!sponsor)return{ok:false,message:"No se pudo preparar la propuesta."};
  if((team.sponsorContracts??[]).some(c=>c.sponsorId===sponsor.id))return{ok:false,message:"Ese sponsor ya tiene contrato activo."};
  if(!sponsor.preferredCategories?.includes(team.categoryId))return{ok:false,message:"El sponsor no está interesado en esta categoría."};
  const interest=evaluateSponsorInterest(sponsor,team,world);
  const valuePerSeason=Math.round(safeNumber(sponsor.budget,500000)*(.22+interest/260)/100000)*100000;
  const proposal={id:id("sp-neg"),sponsorId:sponsor.id,teamId:team.id,status:"sent",interest,valuePerSeason,duration:interest>=78?2:1,createdSeason:world.currentSeason,requirements:sponsor.requirements??[]};
  world.sponsorNegotiations??=[];
  world.sponsorNegotiations.unshift(proposal);
  if(interest>=72){
    proposal.status="accepted";
    const signingBonus=Math.max(50000,Math.round(valuePerSeason*.18/50000)*50000);
    team.budget=safeNumber(team.budget,0)+signingBonus;
    team.sponsorContracts??=[];
    team.sponsorContracts.push({sponsorId:sponsor.id,valuePerSeason,duration:proposal.duration,expiresAt:world.currentSeason+proposal.duration,satisfaction:Math.min(88,interest),bonusConditions:sponsor.requirements??[],signingBonus,startedAt:world.currentSeason});
    updateWorldFinances(world);
    addUniverseNews(world,"Nuevo sponsor",`${sponsor.name} firma con ${team.name} por ${proposal.duration} temporada(s).`,"positive",team.categoryId,"Sponsors");
    return{ok:true,message:`${sponsor.name} aceptó la propuesta. Bono inmediato: US$ ${Math.round(signingBonus/1000)}k.`,proposal,finance:{signingBonus,valuePerSeason,cash:team.budget,projectedBalance:team.finances?.projectedBalance??0}};
  }
  if(interest>=55){proposal.status="counter";proposal.message="Pide mejores resultados o un piloto más comercial.";return{ok:false,message:proposal.message,proposal};}
  proposal.status="rejected";
  proposal.message=interest<42?"Pide presencia en una categoría superior o mejor reputación.":"Pide un perfil comercial más fuerte.";
  return{ok:false,message:proposal.message,proposal};
}

export function processSponsors(world) {
  for(const team of world.teams??[]){
    for(const contract of team.sponsorContracts??[]){
      const sponsor=world.sponsors?.find(s=>s.id===contract.sponsorId);
      if(!sponsor)continue;
      const interest=evaluateSponsorInterest(sponsor,team,world);
      contract.satisfaction=clamp(safeNumber(contract.satisfaction,60)*.8+interest*.2);
      if(contract.satisfaction<35&&Math.random()<.08)addUniverseNews(world,"Sponsor bajo presión",`${sponsor.name} exige señales deportivas más fuertes de ${team.name}.`,"warning",team.categoryId,"Sponsors","high");
      if(contract.satisfaction>82&&Math.random()<.05)addUniverseNews(world,"Sponsor satisfecho",`${sponsor.name} celebra el encaje comercial y deportivo de ${team.name}.`,"positive",team.categoryId,"Sponsors","normal");
      if(interest>85&&Math.random()<.035)addUniverseNews(world,"Interés comercial",`${sponsor.name} ve con buenos ojos el perfil actual de ${team.name}.`,"info",team.categoryId,"Sponsors","normal");
    }
  }
}
