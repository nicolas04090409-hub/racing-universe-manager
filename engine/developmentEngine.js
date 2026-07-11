import { addUniverseNews } from "./newsEngine.js";
import { calculateStaffModifiers } from "./staffEngine.js";
import { recalculateCarSummaries } from "./carPerformanceEngine.js";

const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(v)));
const id=prefix=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
export const componentLabels={frontWing:"Alerón delantero",rearWing:"Alerón trasero",floor:"Piso",suspension:"Suspensión",chassis:"Chasis",engine:"Motor",ers:"ERS",cooling:"Refrigeración",brakes:"Frenos",gearbox:"Caja",weight:"Peso",reliability:"Confiabilidad"};
export const facilityLabels={headquarters:"Sede central",factory:"Fábrica",windTunnel:"Túnel de viento",cfdCenter:"Centro CFD",simulator:"Simulador",strategyRoom:"Sala de estrategia",pitTrainingCenter:"Centro de pit crew",academyCenter:"Academia",medicalCenter:"Centro médico",commercialDepartment:"Departamento comercial"};
export const facilityBenefits={headquarters:"Capacidad operativa global",factory:"Velocidad de proyectos",windTunnel:"Desarrollo aerodinámico",cfdCenter:"Aero y eficiencia de I+D",simulator:"Setup, jóvenes y feedback",strategyRoom:"Estrategia de carrera",pitTrainingCenter:"Pit crew",academyCenter:"Desarrollo de jóvenes",medicalCenter:"Fitness y fatiga",commercialDepartment:"Sponsors"};

export function projectQuote(team, component) {
  const level=team.carDevelopment?.[component]??team[component]??70;
  const isPower=["engine","ers"].includes(component),isAero=["frontWing","rearWing","floor"].includes(component);
  const base=isPower?1200000:isAero?900000:650000;
  const raw=base*(1+level/70);
  return {cost:Math.round(raw/100000)*100000,durationWeeks:6+Math.floor(level/18),risk:clamp(14+level/7-(team.facilities?.factory??5),6,42),expectedGainMin:1,expectedGainMax:level<75?3:2};
}

export function startDevelopmentProject(world,teamId,component,investment=null){
  const team=world.teams.find(t=>t.id===teamId);
  if(!team?.carDevelopment||!(component in team.carDevelopment))return{ok:false,message:"Componente inválido."};
  const quote=projectQuote(team,component),cost=investment??quote.cost;
  const activeForTeam=(world.developmentProjects??[]).filter(p=>p.teamId===team.id&&["planned","active"].includes(p.status));
  if(activeForTeam.length>=3)return{ok:false,message:"El equipo ya tiene demasiados proyectos de I+D activos."};
  if(activeForTeam.some(p=>p.component===component))return{ok:false,message:"Ya hay un proyecto activo sobre ese componente."};
  if(team.budget<cost)return{ok:false,message:"Presupuesto insuficiente para iniciar el proyecto."};
  team.budget-=cost;world.developmentProjects??=[];
  const project={id:id("dev"),teamId:team.id,component,investment:cost,progress:0,durationWeeks:quote.durationWeeks,risk:quote.risk,expectedGainMin:quote.expectedGainMin,expectedGainMax:quote.expectedGainMax,status:"active",createdTick:world.worldTick??0};
  world.developmentProjects.unshift(project);team.developmentProjects??=[];team.developmentProjects.unshift(project.id);
  addUniverseNews(world,"Proyecto de I+D iniciado",`${team.name} inicia desarrollo de ${componentLabels[component]}.`,"info",team.categoryId);
  return{ok:true,message:`Proyecto iniciado: ${componentLabels[component]}.`,project};
}

export function facilityQuote(team, facility){
  const level=team.facilities?.[facility]??1;
  return {targetLevel:Math.min(10,level+1),cost:Math.round(450000*level*(team.categoryId==="apex-gp"?2.4:team.categoryId==="apex-2"?1.1:.65)),durationWeeks:5+level};
}

export function startFacilityProject(world,teamId,facility){
  const team=world.teams.find(t=>t.id===teamId);
  if(!team?.facilities||!(facility in team.facilities))return{ok:false,message:"Instalación inválida."};
  const quote=facilityQuote(team,facility);
  const active=(world.facilityProjects??[]).filter(p=>p.teamId===team.id&&["planned","active"].includes(p.status));
  if(team.facilities[facility]>=10)return{ok:false,message:"Instalación en nivel máximo."};
  if(active.some(p=>p.facility===facility))return{ok:false,message:"Ya existe una mejora activa para esa instalación."};
  if(active.length>=1&&team.reputation<88)return{ok:false,message:"Solo podés tener una obra activa a la vez."};
  if(active.length>=2)return{ok:false,message:"El equipo ya tiene demasiadas obras activas."};
  if(team.budget<quote.cost)return{ok:false,message:"Presupuesto insuficiente."};
  team.budget-=quote.cost;world.facilityProjects??=[];
  const project={id:id("fac"),teamId:team.id,facility,targetLevel:quote.targetLevel,cost:quote.cost,durationWeeks:quote.durationWeeks,progress:0,status:"active",createdTick:world.worldTick??0};
  world.facilityProjects.unshift(project);team.facilityProjects??=[];team.facilityProjects.unshift(project.id);
  addUniverseNews(world,"Obra iniciada",`${team.name} mejora ${facilityLabels[facility]} a nivel ${quote.targetLevel}.`,"info",team.categoryId);
  return{ok:true,message:`Mejora iniciada: ${facilityLabels[facility]} nivel ${quote.targetLevel}.`,project};
}

function completeDevelopmentProject(world,project){
  const team=world.teams.find(t=>t.id===project.teamId);if(!team)return;
  const mods=calculateStaffModifiers(team,world),facility=(team.facilities?.factory??5)+(team.facilities?.cfdCenter??5);
  const successChance=100-project.risk+(mods.reliability??0)+facility*.4;
  if(Math.random()*100>successChance){project.status="failed";project.completedTick=world.worldTick??0;addUniverseNews(world,"Proyecto fallido",`${team.name} no logró validar la mejora de ${componentLabels[project.component]}.`,"warning",team.categoryId);return;}
  const range=project.expectedGainMax-project.expectedGainMin+1,gain=clamp(project.expectedGainMin+Math.floor(Math.random()*range)+(mods[project.component==="engine"?"engineDevelopment":project.component==="floor"?"aeroDevelopment":"chassisDevelopment"]>7&&Math.random()<.35?1:0),1,5);
  team.carDevelopment[project.component]=clamp(team.carDevelopment[project.component]+gain,1,100);
  team.seasonTechGain=(team.seasonTechGain??0)+gain;
  project.status="completed";project.gain=gain;project.completedTick=world.worldTick??0;recalculateCarSummaries(team);
  addUniverseNews(world,"Mejora validada",`${team.name} gana +${gain} en ${componentLabels[project.component]}.`,"positive",team.categoryId);
}

function completeFacilityProject(world,project){
  const team=world.teams.find(t=>t.id===project.teamId);if(!team)return;
  team.facilities[project.facility]=project.targetLevel;project.status="completed";project.completedTick=world.worldTick??0;
  team.facilitiesLevel=clamp(Object.values(team.facilities).reduce((a,b)=>a+b,0));
  addUniverseNews(world,"Instalación mejorada",`${team.name} sube ${facilityLabels[project.facility]} a nivel ${project.targetLevel}.`,"positive",team.categoryId);
}

export function archiveFinishedProjects(world,keepTicks=3){
  world.projectHistory??=[];
  for(const listName of ["developmentProjects","facilityProjects"]){
    const keep=[];
    for(const project of world[listName]??[]){
      if(["completed","failed","cancelled"].includes(project.status)&&(world.worldTick??0)-(project.completedTick??world.worldTick??0)>keepTicks)world.projectHistory.unshift({...project,archivedFrom:listName});
      else keep.push(project);
    }
    world[listName]=keep;
  }
  world.projectHistory=world.projectHistory.slice(0,80);
}

export function progressDevelopmentProjects(world,weeks=1){
  for(const project of (world.developmentProjects??[]).filter(p=>p.status==="active")){
    const team=world.teams.find(t=>t.id===project.teamId),speed=1+((team?.facilities?.factory??5)-5)*.035+((team?.staffModifiers?.chassisDevelopment??0)*.01);
    project.progress=clamp(project.progress+(weeks/project.durationWeeks)*100*speed,0,100);
    if(project.progress>=100)completeDevelopmentProject(world,project);
  }
  for(const project of (world.facilityProjects??[]).filter(p=>p.status==="active")){
    project.progress=clamp(project.progress+(weeks/project.durationWeeks)*100,0,100);
    if(project.progress>=100)completeFacilityProject(world,project);
  }
  archiveFinishedProjects(world);
}

export function processAIDevelopment(world){
  const started=[];
  for(const team of world.teams.filter(t=>t.id!==world.userTeamId)){
    const tier=(team.reputation??50)>=86?"top":(team.reputation??50)>=68?"mid":"small";
    const maxActive=tier==="top"?2:tier==="mid"?1:1;
    const cooldown=tier==="top"?5:tier==="mid"?7:9;
    if(team.lastAIDevelopmentTick&&((world.worldTick??0)-team.lastAIDevelopmentTick)<cooldown)continue;
    const active=(world.developmentProjects??[]).filter(p=>p.teamId===team.id&&p.status==="active");
    if(active.length>=maxActive)continue;
    const components=Object.keys(team.carDevelopment??{});
    const philosophy=team.teamPhilosophy??"balanced";
    let list=components.sort((a,b)=>team.carDevelopment[a]-team.carDevelopment[b]);
    if(philosophy==="technical_excellence")list=["floor","frontWing","rearWing","suspension",...list];
    if(philosophy==="budget_efficiency")list=["reliability","weight","brakes",...list];
    if(philosophy==="star_drivers")list=["engine","ers","floor",...list];
    if(philosophy==="aggressive_results")list=["floor","engine","frontWing","ers",...list];
    if(philosophy==="patient_project")list=["factory","simulator","reliability","suspension",...list].filter(c=>components.includes(c));
    if(philosophy==="manufacturer_project")list=["engine","ers","cooling","chassis",...list];
    const component=[...new Set(list)].find(c=>!active.some(p=>p.component===c));
    if(!component)continue;
    const quote=projectQuote(team,component);
    const chance=tier==="top"?.18:tier==="mid"?.13:.09;
    if(team.budget>quote.cost*2.8&&Math.random()<chance){const result=startDevelopmentProject(world,team.id,component,quote.cost);if(result.ok){team.lastAIDevelopmentTick=world.worldTick??0;started.push(result.project);}}
  }
  return started;
}
