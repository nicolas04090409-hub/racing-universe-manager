import { snapshotCategory } from "./categoryEngine.js";

export function createSeasonHistorySnapshot(world,{moves=[],retired=[]}={}){
  const season={season:world.currentSeason,categories:{},majorTransfers:moves,retiredDrivers:retired.map(d=>d.id),majorNews:(world.news??[]).slice(0,20)};
  for(const category of world.categories){
    const state=world.categoryStates[category.id],races=world.raceResults.filter(r=>r.season===world.currentSeason&&r.categoryId===category.id);
    season.categories[category.id]={driversChampion:state.driverStandings[0]?.driverId??null,teamsChampion:state.teamStandings[0]?.teamId??null,driverStandings:structuredClone(state.driverStandings),teamStandings:structuredClone(state.teamStandings),raceResults:races.map(r=>({id:r.id,round:r.round,circuitId:r.circuitId,winnerDriverId:r.results?.[0]?.driverId,winnerTeamId:r.results?.[0]?.teamId,events:r.events?.slice(0,6)??[]})),majorTransfers:moves,majorNews:(world.news??[]).filter(n=>!n.categoryId||n.categoryId===category.id).slice(0,8),promotedDrivers:moves.filter(m=>m.includes("asciende")),retiredDrivers:retired.filter(d=>d.categoryId===category.id).map(d=>d.id),snapshot:snapshotCategory(state)};
  }
  return season;
}

export function storeSeasonHistory(world,context={}){
  world.history = typeof world.history==="object"&&!Array.isArray(world.history)?world.history:{seasons:Array.isArray(world.history)?world.history:[]};
  const snapshot=createSeasonHistorySnapshot(world,context);
  world.history.seasons=world.history.seasons.filter(s=>s.season!==snapshot.season);
  world.history.seasons.unshift(snapshot);
  updateDriverCareerHistory(world,snapshot);
  updateTeamHistory(world,snapshot);
  return snapshot;
}

export function updateDriverCareerHistory(world,seasonSnapshot){
  for(const [categoryId,cat] of Object.entries(seasonSnapshot.categories)){
    for(const row of cat.driverStandings??[]){
      const driver=world.drivers.find(d=>d.id===row.driverId);if(!driver)continue;
      driver.careerHistory??=[];
      const races=world.raceResults.filter(r=>r.season===seasonSnapshot.season&&r.categoryId===categoryId);
      const podiums=races.flatMap(r=>r.results??[]).filter(r=>r.driverId===driver.id&&r.position<=3).length;
      const teamId=world.drivers.find(d=>d.id===driver.id)?.teamId??null;
      driver.careerHistory.unshift({season:seasonSnapshot.season,categoryId,teamId,position:row.position,points:row.points,wins:row.wins,podiums});
      driver.careerHistory=driver.careerHistory.slice(0,20);
    }
  }
}

export function updateTeamHistory(world,seasonSnapshot){
  for(const [categoryId,cat] of Object.entries(seasonSnapshot.categories)){
    for(const row of cat.teamStandings??[]){
      const team=world.teams.find(t=>t.id===row.teamId);if(!team)continue;
      const races=world.raceResults.filter(r=>r.season===seasonSnapshot.season&&r.categoryId===categoryId);
      const podiums=races.flatMap(r=>r.results??[]).filter(r=>r.teamId===team.id&&r.position<=3).length;
      team.history??=[];
      team.history.unshift({season:seasonSnapshot.season,categoryId,constructorsPosition:row.position,points:row.points,wins:row.wins,podiums});
      team.history=team.history.slice(0,20);
    }
  }
}
