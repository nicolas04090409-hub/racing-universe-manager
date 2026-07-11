import { getDriverStat } from "./statUtils.js";

export const TYRE_COMPOUNDS={
  soft:{name:"Soft",pace:1.4,durability:42,warmup:92,wetPerformance:10,risk:9},
  medium:{name:"Medium",pace:.4,durability:64,warmup:78,wetPerformance:16,risk:5},
  hard:{name:"Hard",pace:-.3,durability:82,warmup:62,wetPerformance:12,risk:3},
  intermediate:{name:"Intermediate",pace:-1.1,durability:58,warmup:70,wetPerformance:74,risk:8},
  wet:{name:"Wet",pace:-2.4,durability:72,warmup:58,wetPerformance:96,risk:10}
};

export function recommendedTyre(weather){
  if(weather==="heavy_rain")return"wet";
  if(weather==="light_rain"||weather==="changing")return"intermediate";
  return"medium";
}

export function tyrePerformance(compound,weather,wear=0){
  const tyre=TYRE_COMPOUNDS[compound]??TYRE_COMPOUNDS.medium;
  const wet=["light_rain","heavy_rain","changing"].includes(weather);
  const weatherFit=wet?(tyre.wetPerformance-45)/18:(compound==="intermediate"||compound==="wet"?-3:0);
  return tyre.pace+weatherFit-(wear/100)*2.8;
}

export function estimateTyreWear({compound="medium",circuit,driver,setup={},paceMode="balanced",weather="dry"}){
  const tyre=TYRE_COMPOUNDS[compound]??TYRE_COMPOUNDS.medium;
  const driverSave=(getDriverStat(driver,"tyreManagement",70)-70)*.12;
  const circuitWear=(circuit?.tyreWear??55)/12;
  const setupWear=setup.suspension==="stiff"?2:setup.suspension==="soft"?-1:0;
  const paceWear={push:5,attack:4,balanced:2,defend:3,conserve:0,pit:1}[paceMode]??2;
  const weatherWear=weather==="heavy_rain"&&compound!=="wet"?8:weather==="dry"&&["intermediate","wet"].includes(compound)?10:0;
  return Math.max(2,Math.round(circuitWear+setupWear+paceWear+weatherWear-driverSave+(100-tyre.durability)/18));
}
