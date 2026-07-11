const safeNumber=(value,fallback=50)=>{const number=Number(value);return Number.isFinite(number)?number:fallback;};
const clamp=(v,min=1,max=100)=>Math.max(min,Math.min(max,Math.round(safeNumber(v,min))));
const importance=v=>safeNumber(v,50)/100;
const avg=arr=>arr.reduce((a,b)=>a+b,0)/Math.max(1,arr.length);

export function ensureCarDevelopment(team){
  team.carDevelopment??={frontWing:team.aerodynamics??70,rearWing:team.aerodynamics??70,floor:team.aerodynamics??70,suspension:team.chassis??70,chassis:team.chassis??70,engine:team.engine??70,ers:team.engine??70,cooling:team.reliability??70,brakes:team.chassis??70,gearbox:team.reliability??70,weight:team.carPerformance??70,reliability:team.reliability??70};
  return team.carDevelopment;
}

export function recalculateCarSummaries(team){
  const c=ensureCarDevelopment(team);
  team.aerodynamics=clamp(c.floor*.45+c.frontWing*.28+c.rearWing*.27);
  team.engine=clamp(c.engine*.65+c.ers*.25+c.cooling*.10);
  team.chassis=clamp(c.chassis*.30+c.suspension*.24+c.brakes*.16+c.gearbox*.14+c.weight*.16);
  team.reliability=clamp(c.reliability*.55+c.cooling*.25+c.gearbox*.20);
  const weighted=
    c.floor*.15+c.frontWing*.09+c.rearWing*.08+
    c.engine*.17+c.ers*.08+
    c.chassis*.10+c.suspension*.08+c.brakes*.06+c.gearbox*.05+
    c.weight*.07+c.reliability*.07;
  team.carPerformance=clamp(weighted);
  return team.carPerformance;
}

export function calculateCarPerformance(team,circuit={},gameState=null){
  const c=ensureCarDevelopment(team),mods=team.staffModifiers??{};
  const aero=avg([c.floor*1.3,c.frontWing,c.rearWing])*(.75+importance(circuit.aeroImportance)*.5);
  const power=avg([c.engine*1.25,c.ers,c.cooling*.35])*(.78+importance(circuit.engineImportance)*.45);
  const braking=avg([c.brakes,c.suspension])*(.78+importance(circuit.brakingImportance)*.45);
  const traction=avg([c.suspension,c.chassis,c.gearbox])*(.78+importance(circuit.tractionImportance)*.45);
  const tyre=avg([c.suspension,c.weight])*(.9+importance(circuit.tyreWear)*.25);
  const reliability=avg([c.reliability,c.cooling,c.gearbox])*(.88+importance(circuit.safetyCarChance)*.22);
  const street=circuit.streetCircuit?avg([c.brakes,c.suspension,c.reliability])*0.1:0;
  const raw=aero*.25+power*.23+braking*.11+traction*.14+tyre*.1+reliability*.11+street+safeNumber(mods.setup,0)*.45+safeNumber(mods.strategy,0)*.25;
  team.carPerformanceByCircuit??={};
  if(circuit.id)team.carPerformanceByCircuit[circuit.id]=clamp(raw);
  team.strategyStrength=clamp((team.strategy??70)+safeNumber(mods.strategy,0));
  team.pitCrewStrength=clamp((team.pitCrew??70)+safeNumber(mods.pitCrew,0));
  team.setupQuality=clamp(avg([team.facilities?.simulator??5,team.facilities?.strategyRoom??5])*8+safeNumber(mods.setup,0));
  team.reliabilityRisk=clamp(105-reliability+(importance(circuit.tyreWear)*5),1,99);
  return clamp(raw);
}
