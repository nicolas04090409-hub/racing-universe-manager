import { getDriverStat } from "./statUtils.js";

const pick=(items)=>items[Math.floor(Math.random()*items.length)];

export function generateWeatherForecast(circuit){
  const rain=circuit.rainProbability??15;
  const session=()=>{
    const roll=Math.random()*100;
    if(roll<rain*.18)return"heavy_rain";
    if(roll<rain*.55)return"light_rain";
    if(roll<rain*.8)return"changing";
    if(roll<rain+18)return"cloudy";
    return"dry";
  };
  return {practice:session(),qualifying:session(),race:session()};
}

export function weatherLabel(weather){
  return {dry:"Seco",cloudy:"Nublado",light_rain:"Lluvia ligera",heavy_rain:"Lluvia fuerte",changing:"Cambiante"}[weather]??weather;
}

export function weatherPaceModifier(weather,driver){
  const wet=getDriverStat(driver,"wetSkill",70);
  if(weather==="dry")return 0;
  if(weather==="cloudy")return .2;
  if(weather==="changing")return -1.2+(wet-70)*.035;
  if(weather==="light_rain")return -2.8+(wet-70)*.06;
  if(weather==="heavy_rain")return -6.2+(wet-70)*.09;
  return 0;
}

export function weatherRiskModifier(weather){
  return {dry:0,cloudy:1,changing:5,light_rain:8,heavy_rain:16}[weather]??0;
}

export function evolveWeather(current){
  if(current==="changing")return pick(["dry","cloudy","light_rain"]);
  if(current==="light_rain"&&Math.random()<.25)return pick(["changing","heavy_rain","cloudy"]);
  if(current==="heavy_rain"&&Math.random()<.35)return"light_rain";
  if(current==="dry"&&Math.random()<.08)return"cloudy";
  return current;
}
