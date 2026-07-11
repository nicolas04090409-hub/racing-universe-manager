const clamp=(v,min=1,max=100)=>Math.max(min,Math.min(max,Math.round(v)));
const importance=v=>(v??50)/100;
const avg=arr=>arr.reduce((a,b)=>a+b,0)/arr.length;

export function ensureCarDevelopment(team){
  team.carDevelopment??={frontWing:team.aerodynamics??70,rearWing:team.aerodynamics??70,floor:team.aerodynamics??70,suspension:team.chassis??70,chassis:team.chassis??70,engine:team.engine??70,ers:team.engine??70,cooling:team.reliability??70,brakes:team.chassis??70,gearbox:team.reliability??70,weight:team.carPerformance??70,reliability:team.reliability??70};
  return team.carDevelopment;
}

export function recalculateCarSummaries(team){
  const c=ensureCarDevelopment(team);
  team.aerodynamics=clamp(avg([c.frontWing,c.rearWing,c.floor]));
  team.engine=clamp(avg([c.engine,c.ers]));
  team.chassis=clamp(avg([c.suspension,c.chassis,c.brakes,c.gearbox,c.weight]));
  team.reliability=clamp(avg([c.reliability,c.cooling,c.gearbox]));
  team.carPerformance=clamp(avg([team.aerodynamics,team.engine,team.chassis,team.reliability*.75]));
  return team.carPerformance;
}

export function calculateCarPerformance(team,circuit={},gameState=null){
  const c=ensureCarDevelopment(team),mods=team.staffModifiers??{};
  const aero=avg([c.floor*1.25,c.frontWing,c.rearWing])*(.75+importance(circuit.aeroImportance)*.5);
  const power=avg([c.engine*1.2,c.ers])*(.78+importance(circuit.engineImportance)*.45);
  const braking=avg([c.brakes,c.suspension])*(.78+importance(circuit.brakingImportance)*.45);
  const traction=avg([c.suspension,c.chassis,c.gearbox])*(.78+importance(circuit.tractionImportance)*.45);
  const tyre=avg([c.suspension,c.weight])*(.9+importance(circuit.tyreWear)*.25);
  const reliability=avg([c.reliability,c.cooling,c.gearbox])*(.88+importance(circuit.safetyCarChance)*.22);
  const street=circuit.streetCircuit?avg([c.brakes,c.suspension,c.reliability])*0.1:0;
  const raw=aero*.24+power*.22+braking*.12+traction*.14+tyre*.1+reliability*.12+street+(mods.setup??0)*.45+(mods.strategy??0)*.25;
  team.carPerformanceByCircuit??={};
  if(circuit.id)team.carPerformanceByCircuit[circuit.id]=clamp(raw);
  team.strategyStrength=clamp((team.strategy??70)+(mods.strategy??0));
  team.pitCrewStrength=clamp((team.pitCrew??70)+(mods.pitCrew??0));
  team.setupQuality=clamp(avg([team.facilities?.simulator??5,team.facilities?.strategyRoom??5])*8+(mods.setup??0));
  team.reliabilityRisk=clamp(105-reliability+(importance(circuit.tyreWear)*5),1,99);
  return clamp(raw);
}
