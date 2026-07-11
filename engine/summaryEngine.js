import { calculateTeamFinances } from "./economyEngine.js";

export function getTeamChampionshipPosition(teamId, categoryId, gameState){
  return gameState.categoryStates?.[categoryId]?.teamStandings?.find(row=>row.teamId===teamId)?.position??null;
}

export function getBestDriverStandingForTeam(teamId, categoryId, gameState){
  const team=gameState.teams.find(t=>t.id===teamId);
  const standings=gameState.categoryStates?.[categoryId]?.driverStandings??[];
  return standings.filter(row=>team?.drivers?.includes(row.driverId)).sort((a,b)=>a.position-b.position)[0]??null;
}

export function getOverallCarRating(team){return Math.round(team.carPerformance??((team.aerodynamics+team.engine+team.chassis+team.reliability)/4));}
export function getProjectedBalance(team, gameState){return calculateTeamFinances(team,gameState).projectedBalance;}

export function getNextRaceInfo(categoryId, gameState, data={}){
  const category=gameState.categories.find(c=>c.id===categoryId),state=gameState.categoryStates?.[categoryId];
  const round=state?.currentRound??1,circuitId=category?.calendar?.[round-1],circuit=(data.circuits??[]).find(c=>c.id===circuitId);
  return {category,state,round,total:category?.calendar?.length??0,circuit,circuitId};
}

export function getActiveProjectsSummary(teamId, gameState){
  const development=(gameState.developmentProjects??[]).filter(p=>p.teamId===teamId&&p.status==="active");
  const facilities=(gameState.facilityProjects??[]).filter(p=>p.teamId===teamId&&p.status==="active");
  return {development,facilities,total:development.length+facilities.length,label:`${development.length} I+D · ${facilities.length} obras`};
}

export function getUserTeamSummary(gameState,data={}){
  const team=gameState.teams.find(t=>t.id===gameState.userTeamId),category=gameState.categories.find(c=>c.id===team?.categoryId);
  const next=getNextRaceInfo(team?.categoryId,gameState,data),position=getTeamChampionshipPosition(team?.id,team?.categoryId,gameState),best=getBestDriverStandingForTeam(team?.id,team?.categoryId,gameState);
  const bestDriver=gameState.drivers.find(d=>d.id===best?.driverId),projects=getActiveProjectsSummary(team?.id,gameState),balance=getProjectedBalance(team,gameState);
  return {team,category,state:next.state,round:next.round,totalRounds:next.total,nextRace:next.circuit,position,bestDriver,bestDriverStanding:best,carRating:getOverallCarRating(team),reliability:team.reliability??team.carDevelopment?.reliability,budget:team.budget,balance,projects};
}
