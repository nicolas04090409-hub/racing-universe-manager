import { processAIDriverMarket } from "./aiMarketEngine.js";
import { calculateCarPerformance, recalculateCarSummaries } from "./carPerformanceEngine.js";
import { progressDevelopmentProjects, processAIDevelopment } from "./developmentEngine.js";
import { updateWorldFinances } from "./economyEngine.js";
import { addUniverseNews } from "./newsEngine.js";
import { generateMarketRumors } from "./rumorEngine.js";
import { processSponsors } from "./sponsorEngine.js";
import { applyStaffModifiers } from "./staffEngine.js";
import { initializeRelationships,tickRelationships } from "./livingWorldEngine.js";
import { processAcademies } from "./academyEngine.js";

const clamp=(v,min=1,max=100)=>Math.max(min,Math.min(max,Math.round(v)));

export function advanceWorld(world,data={},options={}){
  const ticks=Math.max(0,Number(options.ticks??1));
  if(!ticks)return {tick:world.worldTick??0,developmentProjects:(world.developmentProjects??[]).length,facilityProjects:(world.facilityProjects??[]).length};
  return processWorldTick(world,data,ticks,options.reason??"world");
}

export function processWorldTick(world,data={},weeks=1,reason="world"){
  world.worldTick=(world.worldTick??0)+weeks;
  world.lastWorldAdvanceReason=reason;
  initializeRelationships(world);
  applyStaffModifiers(world);
  for(const team of world.teams??[])recalculateCarSummaries(team);
  progressDevelopmentProjects(world,weeks);
  if(world.worldTick%4===0)processAIDevelopment(world);
  for(const team of world.teams??[]){
    const firstCircuitId=world.categories.find(c=>c.id===team.categoryId)?.calendar?.[(world.categoryStates?.[team.categoryId]?.currentRound??1)-1];
    const circuit=data.circuits?.find(c=>c.id===firstCircuitId)??{};
    calculateCarPerformance(team,circuit,world);
  }
  updateWorldFinances(world);
  processSponsors(world);
  processAcademies(world);
  tickRelationships(world);
  for(const driver of world.drivers.filter(d=>!d.retired&&d.teamId)){
    const team=world.teams.find(t=>t.id===driver.teamId),fitnessBoost=(team?.staffModifiers?.fitness??0)+(team?.facilities?.medicalCenter??5)-5;
    driver.fitness=clamp((driver.fitness??90)+fitnessBoost*.08-weeks*.12,45,100);
    driver.morale=clamp((driver.morale??70)+(team?.staffModifiers?.morale??0)*.05,20,100);
  }
  if(world.worldTick%6===0){processAIDriverMarket(world,"world_tick");generateMarketRumors(world,3);}
  if(world.worldTick%6===0)addUniverseNews(world,"Pulso del paddock","Los equipos avanzan proyectos, sponsors y preparación técnica entre carreras.","info");
  world.updatedAt=new Date().toISOString();
  return {tick:world.worldTick,developmentProjects:(world.developmentProjects??[]).length,facilityProjects:(world.facilityProjects??[]).length};
}
