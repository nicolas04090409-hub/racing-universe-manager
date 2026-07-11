import { weatherRiskModifier } from "./weatherEngine.js";
import { getDriverStat, getTeamStat } from "./statUtils.js";

const id=prefix=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const pick=items=>items[Math.floor(Math.random()*items.length)];

export function applyRaceControlEvent({world,circuit,driver,team,segment,weather,traffic=50,paceMode="balanced"}){
  const consistency=getDriverStat(driver,"consistency",70),aggression=getDriverStat(driver,"aggression",70);
  const reliability=getTeamStat(team,"reliability",75),pitCrew=team.pitCrewStrength??team.pitCrew??70;
  const base=(circuit.safetyCarChance??12)/9+(circuit.streetCircuit?3:0)+weatherRiskModifier(weather)/3+traffic/35;
  const risk=base+(100-reliability)/13+(aggression-70)/18+(70-consistency)/12+(paceMode==="push"||paceMode==="attack"?3:0);
  if(Math.random()*100>risk)return null;
  let type=pick(["yellow_flag","driver_error","mechanical_issue","penalty"]);
  if(weatherRiskModifier(weather)>8&&Math.random()<.25)type=pick(["rain_intensifies","rain_stops","red_flag"]);
  if(Math.random()*100<(circuit.safetyCarChance??10))type=pick(["safety_car","virtual_safety_car","yellow_flag"]);
  if(segment==="pit_window"&&Math.random()*100>pitCrew)type=pick(["pit_stop_error","unsafe_release"]);
  const severity={yellow_flag:1,virtual_safety_car:2,safety_car:3,red_flag:5,mechanical_issue:4,driver_error:3,penalty:2,pit_stop_error:3,unsafe_release:3,rain_intensifies:2,rain_stops:1}[type]??1;
  return {id:id("rc"),type,severity,segment,driverId:driver.id,teamId:team.id,message:eventMessage(type,driver,team),timeLoss:severity*(2+Math.random()*4),createdAt:new Date().toISOString()};
}

export function eventMessage(type,driver,team){
  const name=driver?.name??"Un piloto";
  const map={
    safety_car:`Safety Car desplegado tras un incidente de ${name}.`,
    virtual_safety_car:`Virtual Safety Car: dirección de carrera neutraliza brevemente la prueba.`,
    red_flag:`Bandera roja: Race Control detiene la sesión por condiciones peligrosas.`,
    yellow_flag:`Bandera amarilla en pista por una salida de ${name}.`,
    mechanical_issue:`${name} reporta un problema mecánico en el ${team?.shortName??"equipo"}.`,
    driver_error:`Error de ${name}: pierde tiempo en una zona crítica.`,
    unsafe_release:`Investigación por unsafe release en boxes de ${team?.name??"un equipo"}.`,
    penalty:`Penalización para ${name} tras revisión de Race Control.`,
    pit_stop_error:`Parada lenta para ${name}: el pit crew pierde segundos valiosos.`,
    rain_intensifies:`La lluvia se intensifica y obliga a revisar la estrategia.`,
    rain_stops:`La lluvia se detiene y se abre la ventana para neumáticos de seco.`
  };
  return map[type]??`Race Control registra evento para ${name}.`;
}
