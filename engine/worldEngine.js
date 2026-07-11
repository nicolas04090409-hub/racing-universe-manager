import { simulateRace } from "./raceEngine.js";
import { applyRaceFinances,applySeasonPrizes,updateWorldFinances } from "./economyEngine.js";
import { developDrivers } from "./driverDevelopment.js";
import { developAiTeams } from "./teamEngine.js";
import { syncTeamsAndDrivers } from "./syncEngine.js";
import { applyContractEndOfSeason, createContractWarnings, normalizeDriverContracts } from "./contractEngine.js";
import { processAIDriverMarket } from "./aiMarketEngine.js";
import { processPlayerNegotiations } from "./negotiationEngine.js";
import { generateMarketRumors } from "./rumorEngine.js";
import { addUniverseNews,promotionInterestNews } from "./newsEngine.js";
import { allCategoriesComplete,categoryComplete,createCategoryStates,getCategoryState,recalculateCategoryStandings,resetCategoryStates,snapshotCategory } from "./categoryEngine.js";
import { fillEmptySeats,generateYoungDrivers,processCategoryPromotions,processRetirements } from "./promotionEngine.js";
import { createManagerOffers } from "./managerCareerEngine.js";
import { advanceWorld } from "./worldSimulationEngine.js";
import { applyStaffModifiers } from "./staffEngine.js";
import { recalculateCarSummaries } from "./carPerformanceEngine.js";
import { validateGameState } from "./validationEngine.js";
import { storeSeasonHistory } from "./historyEngine.js";
import { initializeRelationships,updateReputationsAfterRace,updateReputationsEndSeason } from "./livingWorldEngine.js";
import { clampAllDrivers } from "./driverAttributeUtils.js";
import { commitRaceResult, getRaceResultForRound } from "./raceResultEngine.js";
import { ensureSeasonDevelopmentBaselines } from "./developmentBaselineEngine.js";
import { ensureTeamThemes } from "./teamThemeEngine.js";
import { SAVE_FORMAT_VERSION } from "../appMeta.js";

const clone=value=>structuredClone(value);
export const currentCategory=world=>world.categories.find(c=>c.id===world.currentCategoryId);

export function createWorld(data,userTeamId){
  const team=data.teams.find(t=>t.id===userTeamId),category=data.categories.find(c=>c.id===team?.categoryId)??data.categories[0];
  const world={version:15,saveVersion:SAVE_FORMAT_VERSION,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),currentSeason:2026,currentDate:"2026-03-01",worldTick:0,currentCategoryId:category.id,viewCategoryId:category.id,userRole:"team-principal",userTeamId,managerReputation:team?.reputation??50,managerHistory:[],managerOffers:[],negotiations:[],sponsorNegotiations:[],developmentProjects:[],facilityProjects:[],projectHistory:[],activeWeekend:null,categories:clone(data.categories),circuits:clone(data.circuits??[]),academies:clone(data.academies??[]),manufacturers:clone(data.manufacturers??[]),sponsors:clone(data.sponsors??[]),staff:clone(data.staff??[]),teams:clone(data.teams),drivers:clone(data.drivers).map(d=>({...d,careerHistory:d.careerHistory??[]})),categoryStates:{},raceResults:[],history:{seasons:[]},archive:{},relationships:[],marketNews:[],news:[]};
  world.categoryStates=createCategoryStates(world);syncTeamsAndDrivers(world);clampAllDrivers(world);normalizeDriverContracts(world);applyStaffModifiers(world);for(const t of world.teams)recalculateCarSummaries(t);ensureTeamThemes(world);ensureSeasonDevelopmentBaselines(world,{force:true});updateWorldFinances(world);initializeRelationships(world);createContractWarnings(world);validateGameState(world);
  addUniverseNews(world,"Bienvenido al universo",`Asumiste como director de ${team?.name} en ${category.name}. Las tres categorías ya están activas.`,"positive",category.id);
  return world;
}

export function recalculateStandings(world,categoryId=world.currentCategoryId){return recalculateCategoryStandings(world,categoryId);}

export function simulateCategoryNextRace(world,data,categoryId){
  const category=world.categories.find(c=>c.id===categoryId),state=getCategoryState(world,categoryId);if(!category||categoryComplete(world,categoryId))return null;
  const existing=getRaceResultForRound(world,category.id,state.currentRound);if(existing)return existing;
  const circuit=data.circuits.find(c=>c.id===category.calendar[state.currentRound-1]);if(!circuit)return null;
  const race=simulateRace({category,teams:world.teams,drivers:world.drivers,circuit,season:world.currentSeason,round:state.currentRound});
  const committed=commitRaceResult(world,category.id,state.currentRound,race);
  for(const team of world.teams.filter(t=>t.categoryId===category.id))applyRaceFinances(team,data.regulations);
  world.updatedAt=new Date().toISOString();
  if(state.currentRound===Math.ceil(category.calendar.length/2)){promotionInterestNews(world,category.id);processAIDriverMarket(world,"midseason");generateMarketRumors(world,3);}
  return committed;
}
export function simulateNextRace(world,data){advanceWorld(world,data,{ticks:1,reason:"single_race"});return simulateCategoryNextRace(world,data,world.currentCategoryId);}

export function simulateGlobalWeekend(world,data){
  advanceWorld(world,data,{ticks:1,reason:"global_weekend"});const races=[];for(const category of [...world.categories].sort((a,b)=>b.level-a.level)){const race=simulateCategoryNextRace(world,data,category.id);if(race)races.push(race);}processPlayerNegotiations(world);world.currentDate=`${world.currentSeason}-${String(Math.min(12,3+Math.max(...Object.values(world.categoryStates).map(s=>s.currentRound)))).padStart(2,"0")}-01`;return races;
}

export function simulateRemainingSeason(world,data){const races=[];while(!allCategoriesComplete(world)){const batch=simulateGlobalWeekend(world,data);if(!batch.length)break;races.push(...batch);}return races;}

function developAllDrivers(world){
  const updated=new Map();for(const category of world.categories){const drivers=world.drivers.filter(d=>d.categoryId===category.id),standings=getCategoryState(world,category.id).driverStandings;for(const driver of developDrivers(drivers,standings,category.developmentRules))updated.set(driver.id,driver);}
  world.drivers=world.drivers.map(d=>updated.get(d.id)??{...d,age:d.retired?d.age:d.age+1});
  clampAllDrivers(world);
}

export function finishSeason(world,data){
  if(!allCategoriesComplete(world))return{ok:false,message:"Para cerrar el año deben terminar los calendarios de todas las categorías."};
  const champions=[];
  for(const category of world.categories){const state=getCategoryState(world,category.id),driver=state.driverStandings[0],team=state.teamStandings[0];state.championDriverId=driver?.driverId??null;state.championTeamId=team?.teamId??null;applySeasonPrizes(world.teams,state.teamStandings,data.regulations);champions.push({categoryId:category.id,driverId:driver?.driverId,teamId:team?.teamId});addUniverseNews(world,`Campeón de ${category.shortName}`,`${world.drivers.find(d=>d.id===driver?.driverId)?.name} conquista la temporada ${world.currentSeason}.`,"positive",category.id);}
  const playerTeam=world.teams.find(t=>t.id===world.userTeamId),playerState=getCategoryState(world,playerTeam.categoryId),playerPosition=playerState.teamStandings.find(r=>r.teamId===playerTeam.id)?.position??null;
  world.managerHistory.push({season:world.currentSeason,teamId:playerTeam.id,categoryId:playerTeam.categoryId,position:playerPosition});
  updateReputationsEndSeason(world);advanceWorld(world,data,{ticks:2,reason:"season_rollover"});developAllDrivers(world);const retired=processRetirements(world);applyContractEndOfSeason(world);processAIDriverMarket(world,"postseason");processPlayerNegotiations(world);generateMarketRumors(world,6);const moves=processCategoryPromotions(world);storeSeasonHistory(world,{moves,retired});generateYoungDrivers(world,4,[...world.categories].sort((a,b)=>b.level-a.level)[0].id);processAIDriverMarket(world,"preseason");fillEmptySeats(world);developAiTeams(world.teams,world.userTeamId,data.regulations);syncTeamsAndDrivers(world);clampAllDrivers(world);normalizeDriverContracts(world);applyStaffModifiers(world);updateWorldFinances(world);createManagerOffers(world);
  world.currentSeason++;world.currentDate=`${world.currentSeason}-03-01`;world.raceResults=[];resetCategoryStates(world);for(const t of world.teams)recalculateCarSummaries(t);ensureTeamThemes(world);ensureSeasonDevelopmentBaselines(world,{force:true});createContractWarnings(world);world.marketNews=moves;world.updatedAt=new Date().toISOString();
  addUniverseNews(world,`Comienza la temporada ${world.currentSeason}`,"El universo vuelve a ponerse en marcha con parrillas renovadas.","season");
  return{ok:true,message:`Temporada cerrada. Ya comenzó ${world.currentSeason} y tenés ${world.managerOffers.length} oferta(s).`,moves,champions};
}

export { allCategoriesComplete,getCategoryState };

