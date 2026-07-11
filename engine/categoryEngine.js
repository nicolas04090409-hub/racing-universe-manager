const clone = value => structuredClone(value);

export function emptyStandings(world, categoryId) {
  return {
    drivers: world.drivers.filter(d=>d.categoryId===categoryId&&!d.retired).map(d=>({driverId:d.id,points:0,wins:0,podiums:0,bestFinish:null})),
    teams: world.teams.filter(t=>t.categoryId===categoryId).map(t=>({teamId:t.id,points:0,wins:0}))
  };
}

export function createCategoryStates(world) {
  return Object.fromEntries(world.categories.map(category=>{
    const standings=emptyStandings(world,category.id);
    return [category.id,{currentRound:1,completedRaces:[],driverStandings:standings.drivers,teamStandings:standings.teams,championDriverId:null,championTeamId:null}];
  }));
}

export function getCategoryState(world, categoryId=world.currentCategoryId) {
  world.categoryStates ??= createCategoryStates(world);
  return world.categoryStates[categoryId];
}

export function recalculateCategoryStandings(world, categoryId) {
  const state=getCategoryState(world,categoryId), standings=emptyStandings(world,categoryId);
  const drivers=Object.fromEntries(standings.drivers.map(row=>[row.driverId,row]));
  const teams=Object.fromEntries(standings.teams.map(row=>[row.teamId,row]));
  for(const race of world.raceResults.filter(r=>r.season===world.currentSeason&&r.categoryId===categoryId)) for(const result of race.results){
    const driver=drivers[result.driverId],team=teams[result.teamId];if(!driver||!team)continue;
    driver.points+=result.points;team.points+=result.points;
    if(result.position===1){driver.wins++;team.wins++;}if(result.position<=3)driver.podiums++;
    if(!result.retired)driver.bestFinish=driver.bestFinish==null?result.position:Math.min(driver.bestFinish,result.position);
  }
  state.driverStandings=Object.values(drivers).sort((a,b)=>b.points-a.points||b.wins-a.wins||(a.bestFinish??99)-(b.bestFinish??99)).map((r,i)=>({...r,position:i+1}));
  state.teamStandings=Object.values(teams).sort((a,b)=>b.points-a.points||b.wins-a.wins).map((r,i)=>({...r,position:i+1}));
  return state;
}

export function resetCategoryStates(world) {
  world.categoryStates=createCategoryStates(world);
}

export function categoryComplete(world, categoryId) {
  const category=world.categories.find(c=>c.id===categoryId),state=getCategoryState(world,categoryId);
  return state.currentRound>category.calendar.length;
}

export function allCategoriesComplete(world) {
  return world.categories.every(category=>categoryComplete(world,category.id));
}

export function snapshotCategory(state) { return clone(state); }
