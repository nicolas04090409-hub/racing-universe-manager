import { normalizeDriverContracts } from "./contractEngine.js";
import { calculateDriverInterest, finalizeAcceptedNegotiation } from "./negotiationEngine.js";
import { addUniverseNews } from "./newsEngine.js";

const id=prefix=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const rating=d=>d.currentAbility??d.potentialAbilityMax??d.potential??60;
const isTopTeam=team=>(team.reputation??0)>=84&&team.categoryId==="apex-gp";
const isStar=driver=>(driver.currentAbility??0)>=86||(driver.reputation??0)>=82||["lead_driver","star_driver"].includes(driver.role);
function teamChangesThisSeason(world,teamId){return (world.negotiations??[]).filter(n=>n.type==="ai"&&n.teamId===teamId&&["accepted","signed"].includes(n.status)&&n.createdSeason===world.currentSeason).length;}

function teamNeedScore(world, team, driver) {
  const philosophy=team.teamPhilosophy??"balanced";
  const ca=rating(driver),pa=driver.potentialAbilityMax??driver.potential??ca,age=driver.age??25;
  const salaryEfficiency=100-(driver.salary??0)/Math.max(1,team.budget)*120;
  const map={
    youth_development:pa*1.15+(24-age)*1.6,
    star_drivers:ca*1.25+(driver.reputation??50)*.45,
    aggressive_results:ca*1.3+(driver.reputation??50)*.35+(driver.attributes?.pressure??60)*.25,
    technical_excellence:ca*.8+(driver.attributes?.feedback??driver.feedback??60)*.5+(driver.attributes?.consistency??driver.consistency??60)*.45,
    patient_project:pa*1.05+(25-age)*1.35+salaryEfficiency*.25,
    manufacturer_project:ca*.82+(driver.attributes?.feedback??60)*.42+(driver.marketability??driver.popularity??50)*.24,
    budget_efficiency:ca*.75+salaryEfficiency*.45,
    commercial_focus:ca*.7+(driver.marketability??driver.popularity??50)*.75,
    balanced:ca+pa*.32+(driver.reputation??50)*.18
  };
  return map[philosophy]??map.balanced;
}

function weakSeat(world, team) {
  const roster=team.drivers.map(driverId=>world.drivers.find(d=>d.id===driverId)).filter(Boolean);
  const slots=world.categories.find(c=>c.id===team.categoryId)?.driversPerTeam??2;
  if (roster.length<slots) return null;
  const removable=roster.filter(d=>!(isTopTeam(team)&&isStar(d)&&d.contractUntil>world.currentSeason+1&&(d.driverHappiness??70)>45));
  return (removable.length?removable:roster).sort((a,b)=>teamNeedScore(world,team,a)-teamNeedScore(world,team,b))[0];
}

export function processAIDriverMarket(world, phase="midseason") {
  normalizeDriverContracts(world);
  world.negotiations??=[];
  const generated=[];
  const active=new Set(world.negotiations.filter(n=>["sent","counter","waiting","accepted"].includes(n.status)).map(n=>`${n.teamId}:${n.driverId}`));
  const teams=world.teams.filter(t=>t.id!==world.userTeamId).sort((a,b)=>(b.reputation??0)-(a.reputation??0));
  for (const team of teams) {
    const category=world.categories.find(c=>c.id===team.categoryId);
    if(team.lastAIMarketTick&&((world.worldTick??0)-team.lastAIMarketTick)<5)continue;
    if(teamChangesThisSeason(world,team.id)>=(isTopTeam(team)?1:2))continue;
    const weakest=weakSeat(world,team);
    const wantsSeat=!weakest || weakest.contractUntil<=world.currentSeason || teamNeedScore(world,team,weakest)<72 || (phase==="preseason"&&weakest.contractUntil<=world.currentSeason+1);
    if (!wantsSeat && Math.random()>.08) continue;
    const candidates=world.drivers.filter(d=>!d.retired&&d.teamId!==team.id&&(d.contractStatus==="free_agent"||d.contractUntil<=world.currentSeason+1||!d.teamId)&&(d.categoryId===team.categoryId||d.categoryId==="free_agents"||!d.teamId||category.level>=2)).filter(d=>!(isTopTeam(team)&&(d.age??25)<=21&&(d.categoryId==="apex-2"||d.categoryId==="apex-3")&&Math.random()>.18)).filter(d=>!(isStar(d)&&d.contractUntil>world.currentSeason+1&&(d.driverHappiness??70)>45));
    candidates.sort((a,b)=>teamNeedScore(world,team,b)-teamNeedScore(world,team,a));
    const driver=candidates.find(d=>!active.has(`${team.id}:${d.id}`)&&team.budget>(d.salary??0)*.7);
    if (!driver) continue;
    const offer={salary:Math.round((driver.salary??100000)*(driver.teamId?1.08:1.02)*(team.reputation>driver.reputation?1.02:1.14)),duration:driver.age>=34?1:2,role:rating(driver)>84?"lead_driver":driver.age<=21?"junior_driver":"second_driver",signingBonus:Math.round((driver.salary??100000)*(driver.teamId?0.18:.1)),releaseClause:Math.round((driver.marketValue??driver.salary*5)*1.35),optionYears:driver.age<=23?1:0};
    const interest=calculateDriverInterest(driver,team,category,offer,world);
    if (interest.score<42) continue;
    const negotiation={id:id("ai-neg"),type:"ai",driverId:driver.id,teamId:team.id,categoryId:team.categoryId,offer,status:interest.score>=78&&Math.random()<.35?"accepted":"sent",createdSeason:world.currentSeason,createdRound:world.categoryStates?.[team.categoryId]?.currentRound??1,responseDueRound:(world.categoryStates?.[team.categoryId]?.currentRound??1)+1,interest,replaceDriverId:weakest?.id,history:[{status:"sent",message:`${team.name} prepara una oferta por ${driver.name}.`}]};
    world.negotiations.unshift(negotiation);
    team.lastAIMarketTick=world.worldTick??0;
    active.add(`${team.id}:${driver.id}`);
    driver.negotiationStatus="in_negotiation";
    generated.push(negotiation);
    if (generated.length>=Math.max(2,Math.floor(teams.length/6))) break;
  }
  for (const negotiation of generated.filter(n=>n.status==="accepted").slice(0,1)) finalizeAcceptedNegotiation(world,negotiation.id,negotiation.replaceDriverId);
  if (generated.length) addUniverseNews(world,"Mercado activo",`${generated.length} equipos IA movieron fichas en el mercado de pilotos.`,"info");
  return generated;
}
