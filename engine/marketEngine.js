import { syncTeamsAndDrivers } from "./syncEngine.js";
import { addNews } from "./contractEngine.js";

function driverRating(driver) {
  if (driver.currentAbility != null) return driver.currentAbility;
  const a = driver.attributes;
  return a.speed * .2 + a.racePace * .22 + a.qualifying * .12 + a.consistency * .12 + a.overtaking * .08 + a.tyreManagement * .08 + driver.experience * .08 + (driver.potentialAbilityMax??driver.potential) * .1;
}

export function signingCost(driver, regulations) {
  return driver.teamId ? Math.round(driver.marketValue * regulations.market.transferFeeMultiplier) : Math.round(driver.salary * regulations.market.freeAgentSigningBonus);
}

export function signDriver(world, driverId, replaceDriverId, regulations) {
  const team = world.teams.find(item => item.id === world.userTeamId);
  const driver = world.drivers.find(item => item.id === driverId);
  const replaced = world.drivers.find(item => item.id === replaceDriverId && item.teamId === team.id);
  if (!driver || !replaced || driver.retired) return { ok:false, message:"Operación de mercado inválida." };
  if (driver.id === replaced.id) return { ok:false, message:"El piloto ya pertenece al equipo." };
  const cost = signingCost(driver, regulations);
  if (team.budget < cost + driver.salary) return { ok:false, message:"No hay presupuesto para el fichaje y su salario." };
  const previousTeam = world.teams.find(item => item.id === driver.teamId);
  if (previousTeam) { previousTeam.drivers = previousTeam.drivers.map(id => id === driver.id ? replaced.id : id); replaced.categoryId=previousTeam.categoryId; }
  team.budget -= cost;
  team.drivers = team.drivers.map(id => id === replaced.id ? driver.id : id);
  replaced.teamId = previousTeam?.id ?? null; replaced.contractUntil = previousTeam ? world.currentSeason + 1 : world.currentSeason;
  driver.teamId = team.id; driver.categoryId=team.categoryId; driver.contractUntil = world.currentSeason + 2; driver.morale = Math.min(100, driver.morale + 5);
  syncTeamsAndDrivers(world);
  addNews(world, "Nuevo fichaje", `${driver.name} se incorpora a ${team.name}.`, "positive");
  return { ok:true, message:`${driver.name} se incorpora al equipo por ${cost.toLocaleString("es-AR")} USD.` };
}

export function runAiMarket(world, regulations) {
  const available = world.drivers.filter(driver => !driver.retired && (!driver.teamId || driver.contractUntil < world.currentSeason));
  const moves = [];
  for (const team of world.teams.filter(item => item.id !== world.userTeamId)) {
    const current = world.drivers.filter(driver => driver.teamId === team.id && !driver.retired);
    const expired = current.filter(driver => driver.contractUntil < world.currentSeason);
    for (const oldDriver of expired) { oldDriver.teamId = null; team.drivers = team.drivers.filter(id => id !== oldDriver.id); }
    const slots=world.categories.find(category=>category.id===team.categoryId)?.driversPerTeam??2;
    while (team.drivers.length < slots && available.length) {
      const candidates = available.filter(driver => !driver.teamId && (driver.categoryId===team.categoryId||driver.categoryId==null) && driver.salary < team.budget * .16);
      if (!candidates.length) break;
      candidates.sort((a,b) => (driverRating(b) + b.potential * .08 + Math.random()*5) - (driverRating(a) + a.potential * .08 + Math.random()*5));
      const pick = candidates[0]; pick.teamId = team.id; pick.categoryId=team.categoryId; pick.contractUntil = world.currentSeason + 2; team.drivers.push(pick.id); team.budget -= pick.salary;
      moves.push(`${team.name} contrata a ${pick.name}`);
    }
  }
  syncTeamsAndDrivers(world);
  return moves;
}

export { driverRating };
