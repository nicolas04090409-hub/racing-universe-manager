export function applyRaceFinances(team, regulations) {
  team.budget -= regulations.economy.raceTravelCost;
}

export function applySeasonPrizes(teams, teamStandings, regulations) {
  for (const row of teamStandings) {
    const team = teams.find(item => item.id === row.teamId);
    const bonus = regulations.economy.baseSeasonPrize + (teams.length - row.position) * regulations.economy.positionPrizeStep;
    team.budget += bonus;
  }
}

export function upgradeCost(team, area, regulations) {
  return Math.round(regulations.economy.upgradeBaseCost * (1 + team[area] / 35));
}

export function calculateTeamFinances(team, world) {
  const driverSalaries=(team.drivers??[]).map(id=>world.drivers.find(d=>d.id===id)?.salary??0).reduce((a,b)=>a+b,0);
  const staffSalaries=(world.staff??[]).filter(s=>s.teamId===team.id).map(s=>s.salary??0).reduce((a,b)=>a+b,0);
  const supplierCosts=team.supplierContracts?.annualCost??0;
  const developmentSpend=(world.developmentProjects??[]).filter(p=>p.teamId===team.id&&p.status==="active").map(p=>p.investment??0).reduce((a,b)=>a+b,0);
  const facilitySpend=(world.facilityProjects??[]).filter(p=>p.teamId===team.id&&p.status==="active").map(p=>p.cost??0).reduce((a,b)=>a+b,0);
  const sponsorIncome=(team.sponsorContracts??[]).map(s=>s.valuePerSeason??0).reduce((a,b)=>a+b,0);
  const historyList=Array.isArray(world.history)?world.history:(world.history?.seasons??[]);
  const prizeMoney=historyList.flatMap(h=>h.prizes??[]).filter(p=>p.teamId===team.id).map(p=>p.value??0).reduce((a,b)=>a+b,0);
  const category=world.categories?.find(c=>c.id===team.categoryId),state=world.categoryStates?.[team.categoryId],remaining=Math.max(0,(category?.calendar?.length??0)-(state?.currentRound??1)+1);
  const travelCosts=remaining*65000*(team.categoryId==="apex-gp"?6:team.categoryId==="apex-2"?2.1:1);
  const operatingCosts=Math.round((team.facilitiesLevel??60)*12000*(team.categoryId==="apex-gp"?5:team.categoryId==="apex-2"?2:1));
  const estimatedPrize=Math.round((team.budget??0)*((team.reputation??50)>=86?.11:(team.reputation??50)>=68?.075:.045));
  const targetMargin=Math.round((team.budget??0)*(team.financialTargetMargin??((team.reputation??50)>=86?.08:(team.reputation??50)>=68?.05:.025)));
  let projectedBalance=(team.budget??0)+sponsorIncome+prizeMoney+estimatedPrize-driverSalaries-staffSalaries-supplierCosts-travelCosts-operatingCosts;
  if((world.worldTick??0)===0&&projectedBalance<targetMargin)projectedBalance=targetMargin;
  team.finances={cash:team.budget??0,annualBudget:team.budget??0,projectedBalance,driverSalaries,staffSalaries,supplierCosts,developmentSpend,facilitySpend,sponsorIncome,prizeMoney,estimatedPrize,travelCosts,operatingCosts};
  return team.finances;
}

export function updateWorldFinances(world) {
  for(const team of world.teams??[]) calculateTeamFinances(team,world);
}
