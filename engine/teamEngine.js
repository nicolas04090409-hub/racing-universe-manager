import { upgradeCost } from "./economyEngine.js";

export const DEVELOPMENT_AREAS = {
  aerodynamics: "Aerodinámica", engine: "Motor", chassis: "Chasis", reliability: "Confiabilidad",
  strategy: "Estrategia", pitCrew: "Equipo de boxes", facilitiesLevel: "Instalaciones"
};

export function upgradeTeam(team, area, regulations) {
  if (!(area in DEVELOPMENT_AREAS)) return { ok:false, message:"Área de desarrollo inválida." };
  if (team[area] >= 100) return { ok:false, message:"Esta área ya alcanzó su máximo." };
  const cost = upgradeCost(team, area, regulations);
  if (team.budget < cost) return { ok:false, message:"Presupuesto insuficiente." };
  team.budget -= cost;
  team[area] = Math.min(100, team[area] + 1);
  if (["aerodynamics","engine","chassis"].includes(area)) {
    team.carPerformance = Math.round((team.aerodynamics + team.engine + team.chassis) / 3);
  }
  return { ok:true, message:`${DEVELOPMENT_AREAS[area]} mejoró a ${team[area]}.`, cost };
}

export function developAiTeams(teams, userTeamId, regulations) {
  for (const team of teams.filter(item => item.id !== userTeamId)) {
    const areas = ["aerodynamics","engine","chassis","reliability","strategy","pitCrew"];
    const weakest = areas.sort((a,b) => team[a] - team[b])[0];
    if (team.budget > upgradeCost(team, weakest, regulations) * 2) upgradeTeam(team, weakest, regulations);
  }
}
