import { syncTeamsAndDrivers } from "./syncEngine.js";

const newsId=()=>`n-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const addNews = (world, title, body, tone = "info") => {
  world.news ??= [];
  world.news.unshift({ id:newsId(), title, body, tone, categoryId:world.currentCategoryId, season:world.currentSeason, round:world.categoryStates?.[world.currentCategoryId]?.currentRound, createdAt:new Date().toISOString() });
  world.news = world.news.slice(0, 100);
};

export const roleLabels={lead_driver:"Líder",second_driver:"Segundo piloto",junior_driver:"Junior",reserve_driver:"Reserva",pay_driver:"Pay driver",development_driver:"Desarrollo"};
export const contractStatusLabels={signed:"Firmado",expiring:"Por vencer",free_agent:"Libre",in_negotiation:"Negociando",pre_contract:"Precontrato",retiring:"Retiro"};

export function defaultRole(driver, team) {
  if (!driver.teamId) return (driver.currentAbility??65) >= 82 ? "lead_driver" : "development_driver";
  if ((driver.age??25) <= 20) return "junior_driver";
  if ((driver.marketability??0) > 82 && (driver.currentAbility??0) < 76) return "pay_driver";
  return team?.drivers?.[0] === driver.id ? "lead_driver" : "second_driver";
}

export function normalizeDriverContracts(world) {
  for (const team of world.teams ?? []) team.salaryCommitted = 0;
  for (const driver of world.drivers ?? []) {
    const team=world.teams?.find(t=>t.id===driver.teamId);
    driver.salary ??= Math.max(50000, Math.round((driver.currentAbility??65) ** 3 * 35));
    driver.contractValue ??= Math.round(driver.salary * Math.max(1,(driver.contractUntil??world.currentSeason)-world.currentSeason+1));
    driver.releaseClause ??= driver.teamId ? Math.round((driver.marketValue??driver.salary*4) * (1.15 + ((driver.reputation??50)/180))) : 0;
    driver.optionYears ??= driver.age <= 23 ? 1 : 0;
    driver.role ??= defaultRole(driver, team);
    driver.driverHappiness ??= Math.max(30,Math.min(98,(driver.morale??72)+Math.round(((driver.contractUntil??world.currentSeason)-world.currentSeason)*2)-(driver.role==="reserve_driver"?10:0)));
    if (driver.retired) driver.contractStatus="retiring";
    else if (!driver.teamId) driver.contractStatus="free_agent";
    else if (driver.contractUntil <= world.currentSeason) driver.contractStatus="expiring";
    else driver.contractStatus ??= "signed";
    driver.negotiationStatus ??= "none";
    if (team) team.salaryCommitted = (team.salaryCommitted??0) + driver.salary;
  }
}

export function contractStatus(driver, season) {
  if (driver.retired || driver.contractStatus === "retiring") return { label:"Retiro", tone:"bad" };
  if (!driver.teamId || driver.contractStatus === "free_agent") return { label:"Libre", tone:"warn" };
  if (driver.negotiationStatus === "in_negotiation" || driver.contractStatus === "in_negotiation") return { label:"Negociando", tone:"warn" };
  if (driver.contractUntil < season) return { label:"Vencido", tone:"bad" };
  if (driver.contractUntil === season) return { label:"Finaliza este año", tone:"warn" };
  return { label:`Hasta ${driver.contractUntil}`, tone:"good" };
}

export function renewalCost(driver) { return Math.round(driver.salary * 0.35); }

export function renewPlayerDriver(world, driverId) {
  const team = world.teams.find(item => item.id === world.userTeamId);
  const driver = world.drivers.find(item => item.id === driverId && item.teamId === team?.id && !item.retired);
  if (!team || !driver) return { ok:false, message:"No se puede renovar este contrato." };
  const cost = renewalCost(driver);
  if (team.budget < cost) return { ok:false, message:"Presupuesto insuficiente para la prima de renovación." };
  team.budget -= cost;
  driver.contractUntil = world.currentSeason + 2;
  driver.contractStatus="signed";
  driver.negotiationStatus="none";
  driver.contractValue=driver.salary*2;
  driver.releaseClause=Math.round((driver.marketValue??driver.salary*4)*1.35);
  driver.morale = Math.min(100, driver.morale + 4);
  driver.driverHappiness=Math.min(100,(driver.driverHappiness??driver.morale)+8);
  normalizeDriverContracts(world);
  addNews(world, "Renovación confirmada", `${driver.name} renovó hasta ${driver.contractUntil}.`, "positive");
  syncTeamsAndDrivers(world);
  return { ok:true, message:`${driver.name} renovó hasta ${driver.contractUntil}.`, cost };
}

export function releasePlayerDriver(world, driverId) {
  const team = world.teams.find(item => item.id === world.userTeamId);
  const driver = world.drivers.find(item => item.id === driverId && item.teamId === team?.id);
  if (!team || !driver) return { ok:false, message:"No se puede liberar este piloto." };
  driver.teamId = null;
  driver.contractUntil = world.currentSeason;
  driver.contractStatus="free_agent";
  driver.negotiationStatus="none";
  driver.role="development_driver";
  driver.releaseClause=0;
  driver.driverHappiness=Math.max(35,(driver.driverHappiness??70)-12);
  team.drivers = team.drivers.filter(id => id !== driver.id);
  normalizeDriverContracts(world);
  addNews(world, "Piloto liberado", `${driver.name} quedó libre y ya aparece en el mercado.`, "warning");
  syncTeamsAndDrivers(world);
  return { ok:true, message:`${driver.name} quedó libre.` };
}

export function createContractWarnings(world) {
  const team = world.teams.find(item => item.id === world.userTeamId);
  if (!team) return [];
  normalizeDriverContracts(world);
  const warnings = world.drivers.filter(driver => driver.teamId === team.id && driver.contractUntil <= world.currentSeason).map(driver => `El contrato de ${driver.name} finaliza al terminar la temporada.`);
  for (const warning of warnings) if (!world.news?.some(item => item.body === warning && item.season === world.currentSeason)) addNews(world, "Decisión contractual pendiente", warning, "warning");
  return warnings;
}

export function applyContractEndOfSeason(world) {
  normalizeDriverContracts(world);
  const freed=[],renewed=[];
  for (const driver of world.drivers.filter(d=>!d.retired&&d.teamId&&d.contractUntil<=world.currentSeason)) {
    const team=world.teams.find(t=>t.id===driver.teamId);
    const keepScore=(driver.currentAbility??60)+(driver.potentialStarsVisible??3)*4+(driver.driverHappiness??70)/5+(team?.reputation??50)/10-(driver.age>34?12:0);
    if (team?.id!==world.userTeamId && keepScore>92 && team.budget>driver.salary*0.35) {
      const years=driver.age>=34?1:2+(driver.age<23?1:0);
      team.budget-=Math.round(driver.salary*.25);
      driver.contractUntil=world.currentSeason+years;
      driver.contractStatus="signed";
      driver.contractValue=driver.salary*years;
      driver.driverHappiness=Math.min(100,(driver.driverHappiness??70)+5);
      renewed.push(driver);
      addNews(world,"Renovación automática",`${team.name} renovó a ${driver.name} hasta ${driver.contractUntil}.`,"positive");
    } else {
      if (team) team.drivers=team.drivers.filter(id=>id!==driver.id);
      driver.teamId=null;
      driver.contractStatus="free_agent";
      driver.negotiationStatus="none";
      driver.contractUntil=world.currentSeason;
      driver.releaseClause=0;
      freed.push(driver);
      addNews(world,"Piloto libre",`${driver.name} no renovó y entra al mercado.`,"warning");
    }
  }
  syncTeamsAndDrivers(world);
  normalizeDriverContracts(world);
  return {freed,renewed};
}

export { addNews };
