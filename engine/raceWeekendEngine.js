import { recalculateCategoryStandings } from "./categoryEngine.js";
import { calculateCarPerformance } from "./carPerformanceEngine.js";
import { addUniverseNews } from "./newsEngine.js";
import { updateReputationsAfterRace } from "./livingWorldEngine.js";
import { applyRaceControlEvent } from "./raceControlEngine.js";
import { recommendedTyre,estimateTyreWear,tyrePerformance } from "./tyreEngine.js";
import { generateWeatherForecast,weatherLabel,weatherPaceModifier,evolveWeather } from "./weatherEngine.js";
import { commitRaceResult } from "./raceResultEngine.js";
import { getDriverStat, getTeamStat, safeRaceNumber } from "./statUtils.js";

const randomNormal=()=>Math.random()+Math.random()+Math.random()+Math.random()-2;
const id=prefix=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const setupDefault={aeroLevel:"medium",suspension:"balanced",brakeBias:"balanced",engineMode:"normal"};
const practiceDefault={program:"balance",risk:"medium",setup:setupDefault};
const raceSegments=["start","early_race","first_stint","pit_window","middle_race","final_stint","finish"];

function formatForCategory(category){
  if(category.raceRules?.weekendFormat)return category.raceRules.weekendFormat;
  return category.id==="apex-gp"?["fp1","fp2","fp3","qualifying","race"]:["practice","qualifying","race"];
}
function entrants(world,categoryId){return world.drivers.filter(d=>d.categoryId===categoryId&&d.teamId&&!d.retired).map(driver=>({driver,team:world.teams.find(t=>t.id===driver.teamId)})).filter(e=>e.team);}
function setupModifier(setup,circuit,session){
  let mod=0;
  if(setup.aeroLevel==="high")mod+=(circuit.aeroImportance??70)/100-.35;
  if(setup.aeroLevel==="low")mod+=(circuit.engineImportance??70)/120-.45;
  if(setup.suspension==="soft")mod+=(circuit.tractionImportance??60)/150-.2;
  if(setup.suspension==="stiff")mod+=(circuit.brakingImportance??60)/160-.2;
  if(setup.engineMode==="aggressive")mod+=session==="qualifying"?1.1:.55;
  if(setup.engineMode==="conservative")mod-=.45;
  return mod;
}
function riskModifier(risk){return {low:-.45,medium:0,high:.55}[risk]??0;}
function lapScore({driver,team,circuit,weather,setup=setupDefault,session="race",risk="medium",compound="medium",wear=0,grid=0}){
  const car=safeRaceNumber(calculateCarPerformance(team,circuit),getTeamStat(team,"carPerformance",70)),q=session==="qualifying";
  const driverPart=(q?getDriverStat(driver,"qualifying")*.32+getDriverStat(driver,"speed")*.24:getDriverStat(driver,"racePace")*.28+getDriverStat(driver,"consistency")*.18+getDriverStat(driver,"overtaking")*.12+getDriverStat(driver,"tyreManagement")*.08)+getDriverStat(driver,"pressure")*.08+getDriverStat(driver,"experience")*.06;
  return car*.48+driverPart+setupModifier(setup,circuit,session)*3+riskModifier(risk)*2+weatherPaceModifier(weather,driver)*2+tyrePerformance(compound,weather,wear)*2-safeRaceNumber(grid,0)*.04+randomNormal()*3.2;
}

export function applyWeekendSetup(world,options={}){
  const weekend=world.activeWeekend;if(!weekend)return{ok:false,message:"No hay Race Weekend activo."};
  weekend.playerStrategy.setup={...setupDefault,...weekend.playerStrategy.setup,...(options.setup??{})};
  weekend.playerStrategy.practiceProgram=options.program??weekend.playerStrategy.practiceProgram??"balance";
  weekend.playerStrategy.practiceRisk=options.risk??weekend.playerStrategy.practiceRisk??"medium";
  weekend.playerStrategy.racePlan=options.racePlan??weekend.playerStrategy.racePlan??{};
  return{ok:true,message:"Setup aplicado.",setup:weekend.playerStrategy.setup};
}

export function initializeRaceWeekend(world,categoryId=world.currentCategoryId,circuitId=null){
  const category=world.categories.find(c=>c.id===categoryId),state=world.categoryStates[categoryId],round=state.currentRound;
  const idCircuit=circuitId??category.calendar[round-1],circuit=world.circuits?.find(c=>c.id===idCircuit)??null;
  world.activeWeekend={id:id("weekend"),categoryId,circuitId:idCircuit,round,stage:"setup",format:formatForCategory(category),weatherForecast:generateWeatherForecast(circuit??{}),weather:null,trackEvolution:Math.round(35+Math.random()*25),sessions:{},playerStrategy:{setup:setupDefault,practiceProgram:"balance",practiceRisk:"medium",racePlan:{}},raceState:{segmentIndex:0,events:[],grid:[],classification:[]}};
  addUniverseNews(world,"Race Weekend iniciado",`${category.name} prepara la ronda ${round} en ${circuit?.name??idCircuit}.`,"info",categoryId);
  return world.activeWeekend;
}

export function runPracticeSession(world,options={}){
  const weekend=world.activeWeekend;if(!weekend)return null;
  const category=world.categories.find(c=>c.id===weekend.categoryId),circuit=world.circuits.find(c=>c.id===weekend.circuitId);
  const sessionKey=weekend.format.filter(s=>s.startsWith("fp")||s==="practice").find(s=>!weekend.sessions[s])??"practice";
  const setup=options.setup??weekend.playerStrategy.setup??setupDefault,risk=options.risk??weekend.playerStrategy.practiceRisk??"medium",program=options.program??weekend.playerStrategy.practiceProgram??"balance";
  weekend.playerStrategy.setup=setup;weekend.playerStrategy.practiceRisk=risk;weekend.playerStrategy.practiceProgram=program;
  const weather=weekend.weatherForecast.practice,results=entrants(world,category.id).map(({driver,team})=>{
    const score=lapScore({driver,team,circuit,weather,setup,session:"practice",risk,compound:recommendedTyre(weather)});
    const feedbackQuality=Math.round((getDriverStat(driver,"feedback")+getDriverStat(driver,"experience")+(team.setupQuality??70))/3);
    const setupQuality=Math.max(35,Math.min(99,Math.round(feedbackQuality+setupModifier(setup,circuit,"practice")*7+randomNormal()*4)));
    const fb=practiceFeedback(setup,circuit,driver,setupQuality);
    return{driverId:driver.id,teamId:team.id,time:95-score/10+Math.random()*1.2,setupQuality,tyreWear:estimateTyreWear({compound:recommendedTyre(weather),circuit,driver,setup,paceMode:program==="long_run"?"conserve":"balanced",weather}),racePace:score+(program==="long_run"?2:0),qualifyingPace:score+(program==="qualifying"?2:0),feedback:fb.text,recommendation:fb.recommendation};
  }).sort((a,b)=>a.time-b.time).map((r,i)=>({...r,position:i+1}));
  weekend.sessions[sessionKey]={type:"practice",weather,program,risk,setup,results};
  weekend.stage=nextStage(weekend);
  return weekend.sessions[sessionKey];
}

function practiceFeedback(setup,circuit,driver,quality){
  if(quality>84)return{text:"El balance es estable y los datos son consistentes para el resto del fin de semana.",recommendation:"Mantener setup y probar programa de neumáticos."};
  if(setup.aeroLevel==="low"&&(circuit.aeroImportance??60)>75)return{text:"Tenemos buena velocidad punta, pero sufrimos en curvas rápidas.",recommendation:"Subir carga aerodinámica o ablandar suspensión."};
  if(setup.aeroLevel==="high"&&(circuit.engineImportance??60)>75)return{text:"El auto carga bien en curva, aunque perdemos velocidad en recta.",recommendation:"Bajar carga aerodinámica o usar modo motor más agresivo."};
  if(setup.brakeBias==="aggressive"&&quality<74)return{text:"Hay bloqueos en frenada y el piloto pierde confianza al entrar en curva.",recommendation:"Pasar frenos a conservador o balanceado."};
  if((driver.attributes.feedback??70)>82)return{text:"El auto subvira en curvas lentas; podemos mejorar tracción y freno motor.",recommendation:"Más carga o suspensión más blanda."};
  return{text:"Los datos son útiles, pero falta claridad en el balance general.",recommendation:"Usar programa balance con riesgo medio para limpiar el setup."};
}
export function runQualifyingSession(world,options={}){
  const weekend=world.activeWeekend;if(!weekend)return null;
  const category=world.categories.find(c=>c.id===weekend.categoryId),circuit=world.circuits.find(c=>c.id===weekend.circuitId);
  const setup=options.setup??weekend.playerStrategy.setup??setupDefault,risk=options.risk??"medium",weather=weekend.weatherForecast.qualifying;
  let results=entrants(world,category.id).map(({driver,team})=>({driverId:driver.id,teamId:team.id,score:lapScore({driver,team,circuit,weather,setup,session:"qualifying",risk,compound:"soft"}),traffic:Math.random()<.08,error:Math.random()*100>(getDriverStat(driver,"consistency")+riskModifier(risk)*-8+20)}));
  results=results.map(r=>({...r,score:r.score-(r.traffic?3:0)-(r.error?4:0)})).sort((a,b)=>b.score-a.score).map((r,i)=>({...r,position:i+1,grid:i+1,time:82-r.score/12+i*.02}));
  const qFormat=category.raceRules?.qualifyingFormat??(category.id==="apex-gp"?"q1_q2_q3":"single");
  const session={type:"qualifying",format:qFormat,weather,results,grid:results.map(r=>({driverId:r.driverId,teamId:r.teamId,grid:r.grid})),surprises:results.filter((r,i)=>i<6&&world.teams.find(t=>t.id===r.teamId)?.carPerformance<80).slice(0,3)};
  weekend.sessions.qualifying=session;weekend.raceState.grid=session.grid;weekend.stage=nextStage(weekend);
  addUniverseNews(world,"Clasificación completada",`${world.drivers.find(d=>d.id===results[0]?.driverId)?.name} logra la pole en ${circuit.name}.`,"result",category.id);
  return session;
}

export function runRaceSession(world,options={}){
  const weekend=world.activeWeekend;if(!weekend)return null;
  const category=world.categories.find(c=>c.id===weekend.categoryId),circuit=world.circuits.find(c=>c.id===weekend.circuitId),weather0=weekend.weatherForecast.race;
  if(!weekend.sessions.qualifying)runQualifyingSession(world);
  const grid=weekend.raceState.grid,gridPos=Object.fromEntries(grid.map(g=>[g.driverId,g.grid]));
  const defaultPlan=weekend.playerStrategy.racePlan?.default??{};
  let classification=entrants(world,category.id).map(({driver,team})=>({driverId:driver.id,teamId:team.id,score:100-gridPos[driver.id]*.8,grid:gridPos[driver.id]??99,compound:defaultPlan.startTyre??recommendedTyre(weather0),wear:0,pits:0,events:[],retired:false}));
  const segmentReports=[];let weather=weather0;
  for(const segment of raceSegments){
    if(segment==="finish")break;
    weather=evolveWeather(weather);
    classification=classification.map(row=>{
      if(row.retired)return row;
      const driver=world.drivers.find(d=>d.id===row.driverId),team=world.teams.find(t=>t.id===row.teamId),plan=options.plan?.[driver.id]??weekend.playerStrategy.racePlan?.[driver.id]??weekend.playerStrategy.racePlan?.default??{};
      const paceMode=plan[segment]??plan.pace??(segment==="final_stint"?"push":"balanced");
      const setup=weekend.playerStrategy.setup??setupDefault;
      const wearGain=estimateTyreWear({compound:row.compound,circuit,driver,setup,paceMode,weather});
      row.wear=Math.min(100,row.wear+wearGain);
      if(segment==="pit_window"&&(row.wear>55||plan.pit||plan.mode==="plan_b")){row.pits++;row.compound=plan.compound??plan.nextTyre??recommendedTyre(weather);row.wear=8;row.score-=7-Math.max(0,(team.pitCrewStrength??team.pitCrew??70)-70)/20;}
      row.score+=lapScore({driver,team,circuit,weather,setup,session:"race",risk:paceMode==="push"||paceMode==="attack"?"high":"medium",compound:row.compound,wear:row.wear,grid:row.grid})/18;
      const event=applyRaceControlEvent({world,circuit,driver,team,segment,weather,traffic:classification.length,paceMode});
      if(event){row.events.push(event);row.score-=event.timeLoss;if(event.type==="mechanical_issue"&&event.severity>=4&&Math.random()<.35)row.retired=true;}
      return row;
    }).sort((a,b)=>Number(a.retired)-Number(b.retired)||b.score-a.score);
    segmentReports.push({segment,weather,positions:classification.map((r,i)=>({driverId:r.driverId,teamId:r.teamId,position:i+1,compound:r.compound,wear:r.wear,pits:r.pits,retired:r.retired})),events:classification.flatMap(r=>r.events).filter(e=>e.segment===segment)});
  }
  const leader=classification.find(r=>!r.retired)?.score??classification[0]?.score??100;
  const results=classification.map((r,i)=>({driverId:r.driverId,teamId:r.teamId,position:i+1,grid:safeRaceNumber(r.grid,i+1),points:r.retired?0:(category.pointsSystem[i]??0),retired:r.retired,cause:r.retired?"Fallo mecánico":null,pits:r.pits,tyresUsed:[r.compound],events:r.events,gap:i===0?0:Math.max(0,(leader-safeRaceNumber(r.score,leader))*2+i*.5),time:r.retired?null:5400+Math.max(0,(leader-safeRaceNumber(r.score,leader))*2+i*.5),score:safeRaceNumber(r.score,leader)}));
  const session={type:"race",weather:weather0,segments:segmentReports,results,events:segmentReports.flatMap(s=>s.events)};
  weekend.sessions.race=session;weekend.raceState.classification=results;weekend.stage="post_race";
  return session;
}

export function finalizeRaceWeekend(world,data){
  const weekend=world.activeWeekend;if(!weekend)return{ok:false,message:"No hay fin de semana activo."};
  if(!weekend.sessions.race)runRaceSession(world);
  const category=world.categories.find(c=>c.id===weekend.categoryId),race=weekend.sessions.race;
  const result={id:`rw-${world.currentSeason}-${category.id}-r${weekend.round}`,season:world.currentSeason,round:weekend.round,categoryId:category.id,circuitId:weekend.circuitId,weather:weatherLabel(race.weather),safetyCar:race.events.some(e=>e.type==="safety_car"),raceWeekend:true,segments:race.segments,events:race.events,results:race.results};
  const committed=commitRaceResult(world,category.id,weekend.round,result,{clearWeekend:true,generateNews:false});
  const winner=world.drivers.find(d=>d.id===committed.results[0]?.driverId);
  addUniverseNews(world,"Race Weekend completado",`${winner?.name} gana la ronda ${weekend.round} de ${category.shortName}.`,"result",category.id,"Carrera");
  return{ok:true,message:`Race Weekend completado: victoria de ${winner?.name}.`,race:committed};
}

export function applyRaceControlEventToWeekend(world,event){
  world.activeWeekend?.raceState?.events?.push(event);
  return event;
}

function nextStage(weekend){
  if(weekend.format.some(s=>(s.startsWith("fp")||s==="practice")&&!weekend.sessions[s]))return"practice";
  if(!weekend.sessions.qualifying)return"qualifying";
  if(!weekend.sessions.race)return"race";
  return"post_race";
}

