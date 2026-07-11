import { getCategoryState } from "./categoryEngine.js";
import { addUniverseNews } from "./newsEngine.js";

export function createManagerOffers(world){
  const team=world.teams.find(t=>t.id===world.userTeamId),state=getCategoryState(world,team.categoryId);
  const position=state.teamStandings.find(r=>r.teamId===team.id)?.position??99;
  world.managerReputation=Math.max(20,Math.min(100,(world.managerReputation??team.reputation)+(position<=3?5:position<=6?1:-3)));
  const currentCategory=world.categories.find(c=>c.id===team.categoryId);
  let candidates=world.teams.filter(t=>t.id!==team.id&&Math.abs(t.reputation-world.managerReputation)<=14);
  if(position<=3)candidates=candidates.filter(t=>world.categories.find(c=>c.id===t.categoryId).level<=currentCategory.level);
  else candidates=candidates.filter(t=>world.categories.find(c=>c.id===t.categoryId).level>=currentCategory.level);
  world.managerOffers=candidates.sort((a,b)=>b.reputation-a.reputation).slice(0,3).map((t,i)=>({id:`offer-${world.currentSeason}-${t.id}`,teamId:t.id,categoryId:t.categoryId,objective:t.reputation>=80?"Luchar por el campeonato":t.reputation>=60?"Terminar entre los cinco mejores":"Desarrollar el proyecto",status:"pending",expiresSeason:world.currentSeason+1,priority:i+1}));
  if(world.managerOffers.length)addUniverseNews(world,"Ofertas para el próximo año",`${world.managerOffers.length} equipos quieren conversar con tu representación.`,"positive",team.categoryId);
  return world.managerOffers;
}

export function acceptManagerOffer(world,offerId){
  const offer=world.managerOffers?.find(o=>o.id===offerId&&o.status==="pending"),team=world.teams.find(t=>t.id===offer?.teamId);
  if(!offer||!team)return{ok:false,message:"La oferta ya no está disponible."};
  const oldTeam=world.teams.find(t=>t.id===world.userTeamId);
  offer.status="accepted";world.managerOffers.forEach(o=>{if(o.id!==offer.id&&o.status==="pending")o.status="rejected";});
  world.userTeamId=team.id;world.currentCategoryId=team.categoryId;world.viewCategoryId=team.categoryId;
  addUniverseNews(world,"Cambio de equipo",`El manager deja ${oldTeam?.name} y asume en ${team.name}.`,"positive",team.categoryId);
  return{ok:true,message:`Ahora dirigís ${team.name} en ${world.categories.find(c=>c.id===team.categoryId)?.name}.`};
}

export function rejectManagerOffer(world,offerId){const offer=world.managerOffers?.find(o=>o.id===offerId);if(!offer)return{ok:false,message:"Oferta inexistente."};offer.status="rejected";return{ok:true,message:"Oferta rechazada."};}
