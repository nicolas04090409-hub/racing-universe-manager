const copy=value=>typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value??{}));

export function buildSeasonDevelopmentBaseline(team){
  return {
    season: team.currentSeason,
    carPerformance: team.carPerformance??0,
    aerodynamics: team.aerodynamics??0,
    engine: team.engine??0,
    chassis: team.chassis??0,
    reliability: team.reliability??0,
    components: copy(team.carDevelopment??{})
  };
}

export function ensureSeasonDevelopmentBaselines(world,{force=false}={}){
  for(const team of world.teams??[]){
    if(force||!team.seasonDevelopmentBaseline){
      team.seasonDevelopmentBaseline=buildSeasonDevelopmentBaseline(team);
      team.seasonDevelopmentBaseline.season=world.currentSeason;
    }
  }
}

export function developmentDelta(team){
  const base=team.seasonDevelopmentBaseline??buildSeasonDevelopmentBaseline(team);
  const delta=(now,then)=>Math.round((now??0)-(then??0));
  const global=delta(team.carPerformance,base.carPerformance);
  const areas={
    aerodynamics:delta(team.aerodynamics,base.aerodynamics),
    engine:delta(team.engine,base.engine),
    chassis:delta(team.chassis,base.chassis),
    reliability:delta(team.reliability,base.reliability)
  };
  const magnitude=Object.values(areas).reduce((a,b)=>a+Math.abs(b),0);
  return {base,current:team.carPerformance??0,global,areas,magnitude};
}

export function developmentTrend(team,activeProjects=0,investment=0){
  const d=developmentDelta(team);
  if(d.global<0)return"Retroceso";
  if(d.global===0&&d.magnitude===0)return activeProjects?"Estancado":"Estancado";
  if(d.global<=1&&d.magnitude<=2)return"Mejora lenta";
  if(d.global<=3||d.magnitude<=7)return"Mejora sólida";
  return investment>2500000||activeProjects>=2?"Desarrollo fuerte":"Mejora sólida";
}
