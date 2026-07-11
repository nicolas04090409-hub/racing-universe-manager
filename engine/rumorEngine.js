import { addUniverseNews } from "./newsEngine.js";

export function generateMarketRumors(world, limit=4) {
  const rumors=[];
  const active=(world.negotiations??[]).filter(n=>["sent","counter","waiting","accepted"].includes(n.status)).slice(0,limit);
  for (const negotiation of active) {
    const driver=world.drivers.find(d=>d.id===negotiation.driverId),team=world.teams.find(t=>t.id===negotiation.teamId),category=world.categories.find(c=>c.id===negotiation.categoryId);
    if (!driver||!team) continue;
    let body=`${team.name} evalúa una oferta por ${driver.name}.`;
    if (negotiation.status==="counter") body=`${driver.name} pidió mejores condiciones tras una oferta de ${team.name}.`;
    if (negotiation.status==="waiting") body=`${driver.name} quiere esperar otras ofertas antes de responder a ${team.name}.`;
    if (negotiation.status==="accepted") body=`${team.name} queda cerca de cerrar a ${driver.name} para ${category?.shortName??"la próxima temporada"}.`;
    if (!world.news?.some(n=>n.body===body&&n.season===world.currentSeason)) addUniverseNews(world,"Rumor de mercado",body,"info",negotiation.categoryId);
    rumors.push(body);
  }
  return rumors;
}

export function createContractNews(world, title, body, tone="info", categoryId=null) {
  addUniverseNews(world,title,body,tone,categoryId);
}
