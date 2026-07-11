import { addUniverseNews } from "./newsEngine.js";
import { calculateStaffModifiers } from "./staffEngine.js";
import { recalculateCarSummaries } from "./carPerformanceEngine.js";

const safeNumber=(value,fallback=0)=>{const number=Number(value);return Number.isFinite(number)?number:fallback;};
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(safeNumber(v,min))));
const id=prefix=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
export const componentLabels={frontWing:"Alerón delantero",rearWing:"Alerón trasero",floor:"Piso",suspension:"Suspensión",chassis:"Chasis",engine:"Motor",ers:"ERS",cooling:"Refrigeración",brakes:"Frenos",gearbox:"Caja",weight:"Peso",reliability:"Confiabilidad"};
export const facilityLabels={headquarters:"Sede central",factory:"Fábrica",windTunnel:"Túnel de viento",cfdCenter:"Centro CFD",simulator:"Simulador",strategyRoom:"Sala de estrategia",pitTrainingCenter:"Centro de pit crew",academyCenter:"Academia",medicalCenter:"Centro médico",commercialDepartment:"Departamento comercial"};
export const facilityBenefits={headquarters:"Capacidad operativa global",factory:"Velocidad de proyectos",windTunnel:"Desarrollo aerodinámico",cfdCenter:"Aero y eficiencia de I+D",simulator:"Setup, jóvenes y feedback",strategyRoom:"Estrategia de carrera",pitTrainingCenter:"Pit crew",academyCenter:"Desarrollo de jóvenes",medicalCenter:"Fitness y fatiga",commercialDepartment:"Sponsors"};

export function developmentCapacity(team){
  const rep=safeNumber(team.reputation,50);
  const base=rep>=86?3:rep>=68?2:1;
  const factoryBonus=safeNumber(team.facilities?.factory,5)>=8?1:0;
  return Math.min(4,base+factoryBonus);
}

export function projectQuote(team, component) {
  const level=safeNumber(team.carDevelopment?.[component]??team[component],70);
  const isPower=["engine","ers"].includes(component),isAero=["frontWing","rearWing","floor"].includes(component);
  const tier=level<72?"minor":level<84?"standard":"major";
  const categoryFactor=team.categoryId==="apex-gp"?1.65:(team.categoryId==="apex-2"?0.82:0.55);
  const base=(isPower?650000:isAero?520000:420000)*categoryFactor;
  const levelFactor=.85+level/135;
  const expectedGainMin=tier==="minor"?2:tier==="standard"?1:1;
  const expectedGainMax=tier==="minor"?4:tier==="standard"?3:2;
  const durationWeeks=tier==="minor"?3+(level<65?0:1):tier==="standard"?5:7;
  const risk=clamp(10+level/9-safeNumber(team.facilities?.factory,5)*.8-safeNumber(team.facilities?.cfdCenter,5)*.35,5,34);
  return {cost:Math.round(base*levelFactor/50000)*50000,durationWeeks,risk,expectedGainMin,expectedGainMax};
}

export function startDevelopmentProject(world,teamId,component,investment=null){
  const team=world.teams.find(t=>t.id===teamId);
  if(!team?.carDevelopment||!(component in team.carDevelopment))return{ok:false,message:"Componente inválido."};
  const quote=projectQuote(team,component),cost=investment??quote.cost;
  const activeForTeam=(world.developmentProjects??[]).filter(p=>p.teamId===team.id&&["planned","active"].includes(p.status));
  if(activeForTeam.length>=developmentCapacity(team))return{ok:false,message:`Capacidad llena: este equipo puede tener ${developmentCapacity(team)} proyecto(s) activo(s).`};
  if(activeForTeam.some(p=>p.component===component))return{ok:false,message:"Ya hay un proyecto activo sobre ese componente."};
  if(safeNumber(team.budget,0)<cost)return{ok:false,message:"Presupuesto insuficiente para iniciar el proyecto."};
  team.budget=safeNumber(team.budget,0)-cost;world.developmentProjects??=[];
  const project={id:id("dev"),type:"development",teamId:team.id,component,investment:cost,progress:0,durationWeeks:quote.durationWeeks,risk:quote.risk,expectedGainMin:quote.expectedGainMin,expectedGainMax:quote.expectedGainMax,status:"active",season:world.currentSeason,createdTick:world.worldTick??0};
  world.developmentProjects.unshift(project);team.developmentProjects??=[];team.developmentProjects.unshift(project.id);
  addUniverseNews(world,"Proyecto de I+D iniciado",`${team.name} inicia desarrollo de ${componentLabels[component]}.`,"info",team.categoryId);
  return{ok:true,message:`Proyecto iniciado: ${componentLabels[component]}.`,project};
}

export function facilityQuote(team, facility){
  const level=safeNumber(team.facilities?.[facility],1);
  const categoryFactor=team.categoryId==="apex-gp"?1.75:(team.categoryId==="apex-2"?0.85:0.55);
  return {targetLevel:Math.min(10,level+1),cost:Math.round(260000*level*categoryFactor/50000)*50000,durationWeeks:Math.max(3,Math.min(10,3+Math.ceil(level*.7)))};
}

export function startFacilityProject(world,teamId,facility){
  const team=world.teams.find(t=>t.id===teamId);
  if(!team?.facilities||!(facility in team.facilities))return{ok:false,message:"Instalación inválida."};
  const quote=facilityQuote(team,facility);
  const active=(world.facilityProjects??[]).filter(p=>p.teamId===team.id&&["planned","active"].includes(p.status));
  const maxFacilities=safeNumber(team.reputation,50)>=88?2:1;
  if(team.facilities[facility]>=10)return{ok:false,message:"Instalación en nivel máximo."};
  if(active.some(p=>p.facility===facility))return{ok:false,message:"Ya existe una mejora activa para esa instalación."};
  if(active.length>=maxFacilities)return{ok:false,message:`Solo podés tener ${maxFacilities} obra(s) activa(s) a la vez.`};
  if(safeNumber(team.budget,0)<quote.cost)return{ok:false,message:"Presupuesto insuficiente."};
  team.budget=safeNumber(team.budget,0)-quote.cost;world.facilityProjects??=[];
  const project={id:id("fac"),type:"facility",teamId:team.id,facility,targetLevel:quote.targetLevel,cost:quote.cost,durationWeeks:quote.durationWeeks,progress:0,status:"active",season:world.currentSeason,createdTick:world.worldTick??0};
  world.facilityProjects.unshift(project);team.facilityProjects??=[];team.facilityProjects.unshift(project.id);
  addUniverseNews(world,"Obra iniciada",`${team.name} mejora ${facilityLabels[facility]} a nivel ${quote.targetLevel}.`,"info",team.categoryId);
  return{ok:true,message:`Mejora iniciada: ${facilityLabels[facility]} nivel ${quote.targetLevel}.`,project};
}

function completeDevelopmentProject(world,project){
  const team=world.teams.find(t=>t.id===project.teamId);if(!team)return;
  const mods=calculateStaffModifiers(team,world),facility=safeNumber(team.facilities?.factory,5)+safeNumber(team.facilities?.cfdCenter,5);
  const successChance=100-safeNumber(project.risk,15)+safeNumber(mods.reliability,0)+facility*.35;
  if(Math.random()*100>successChance){project.status="failed";project.completedTick=world.worldTick??0;team.lastDevelopmentResult={status:"failed",component:project.component,message:`No se validó ${componentLabels[project.component]}.`};addUniverseNews(world,"Proyecto fallido",`${team.name} no logró validar la mejora de ${componentLabels[project.component]}.`,"warning",team.categoryId);return;}
  const beforeValue=safeNumber(team.carDevelopment[project.component],70),beforePerformance=safeNumber(team.carPerformance,70);
  const range=safeNumber(project.expectedGainMax,2)-safeNumber(project.expectedGainMin,1)+1;
  const staffKey=project.component==="engine"||project.component==="ers"?"engineDevelopment":["floor","frontWing","rearWing"].includes(project.component)?"aeroDevelopment":"chassisDevelopment";
  const staffBonus=safeNumber(mods[staffKey],0)>7&&Math.random()<.4?1:0;
  const gain=clamp(safeNumber(project.expectedGainMin,1)+Math.floor(Math.random()*Math.max(1,range))+staffBonus,1,7);
  team.carDevelopment[project.component]=clamp(beforeValue+gain,1,100);
  team.seasonTechGain=safeNumber(team.seasonTechGain,0)+gain;
  project.status="completed";project.gain=gain;project.beforeValue=beforeValue;project.afterValue=team.carDevelopment[project.component];project.completedTick=world.worldTick??0;
  recalculateCarSummaries(team);
  project.beforePerformance=beforePerformance;project.afterPerformance=team.carPerformance;project.globalGain=team.carPerformance-beforePerformance;
  team.lastDevelopmentResult={status:"completed",component:project.component,gain,globalGain:project.globalGain,message:`${componentLabels[project.component]} mejoró +${gain}. Rating global ${beforePerformance} → ${team.carPerformance}.`};
  addUniverseNews(world,"Mejora validada",`${team.name} gana +${gain} en ${componentLabels[project.component]} (${beforePerformance} → ${team.carPerformance}).`,"positive",team.categoryId);
}

function completeFacilityProject(world,project){
  const team=world.teams.find(t=>t.id===project.teamId);if(!team)return;
  team.facilities[project.facility]=project.targetLevel;project.status="completed";project.completedTick=world.worldTick??0;
  team.facilitiesLevel=clamp(Object.values(team.facilities).reduce((a,b)=>a+safeNumber(b,0),0));
  team.lastFacilityResult={facility:project.facility,targetLevel:project.targetLevel,message:`${facilityLabels[project.facility]} sube a nivel ${project.targetLevel}. Impacto: ${facilityBenefits[project.facility]}.`};
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
    const team=world.teams.find(t=>t.id===project.teamId),speed=1+(safeNumber(team?.facilities?.factory,5)-5)*.045+(safeNumber(team?.staffModifiers?.chassisDevelopment,0)*.012);
    project.progress=clamp(safeNumber(project.progress,0)+(weeks/project.durationWeeks)*100*speed,0,100);
    if(project.progress>=100)completeDevelopmentProject(world,project);
  }
  for(const project of (world.facilityProjects??[]).filter(p=>p.status==="active")){
    const team=world.teams.find(t=>t.id===project.teamId),speed=1+(safeNumber(team?.facilities?.headquarters,5)-5)*.025;
    project.progress=clamp(safeNumber(project.progress,0)+(weeks/project.durationWeeks)*100*speed,0,100);
    if(project.progress>=100)completeFacilityProject(world,project);
  }
  archiveFinishedProjects(world);
}

export function processAIDevelopment(world){
  const started=[];
  for(const team of world.teams.filter(t=>t.id!==world.userTeamId)){
    const tier=safeNumber(team.reputation,50)>=86?"top":safeNumber(team.reputation,50)>=68?"mid":"small";
    const maxActive=Math.max(1,developmentCapacity(team)-(tier==="top"?1:0));
    const cooldown=tier==="top"?4:tier==="mid"?6:8;
    if(team.lastAIDevelopmentTick!=null&&((world.worldTick??0)-team.lastAIDevelopmentTick)<cooldown)continue;
    const active=(world.developmentProjects??[]).filter(p=>p.teamId===team.id&&p.status==="active");
    if(active.length>=maxActive)continue;
    const components=Object.keys(team.carDevelopment??{});
    const philosophy=team.teamPhilosophy??"balanced";
    let list=components.sort((a,b)=>safeNumber(team.carDevelopment[a],70)-safeNumber(team.carDevelopment[b],70));
    if(philosophy==="technical_excellence")list=["floor","frontWing","rearWing","suspension",...list];
    if(philosophy==="budget_efficiency")list=["reliability","weight","brakes",...list];
    if(philosophy==="star_drivers")list=["engine","ers","floor",...list];
    if(philosophy==="aggressive_results")list=["floor","engine","frontWing","ers",...list];
    if(philosophy==="patient_project")list=["reliability","suspension","chassis",...list];
    if(philosophy==="manufacturer_project")list=["engine","ers","cooling","chassis",...list];
    const component=[...new Set(list)].find(c=>components.includes(c)&&!active.some(p=>p.component===c));
    if(!component)continue;
    const quote=projectQuote(team,component);
    const chance=tier==="top"?.20:tier==="mid"?.14:.09;
    if(safeNumber(team.budget,0)>quote.cost*2.4&&Math.random()<chance){const result=startDevelopmentProject(world,team.id,component,quote.cost);if(result.ok){team.lastAIDevelopmentTick=world.worldTick??0;started.push(result.project);}}
  }
  return started;
}
