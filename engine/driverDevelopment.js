import { clampDriverAttributes } from "./driverAttributeUtils.js";

const clamp=value=>Math.max(1,Math.min(96,Math.round(value)));
const core=["speed","qualifying","racePace","consistency","overtaking","defending","wetSkill","tyreManagement","feedback","adaptability","pressure"];
export function developDrivers(drivers,standings,rules){return drivers.map(driver=>{
  if(driver.retired)return driver;const next=structuredClone(driver),rank=standings.findIndex(r=>r.driverId===driver.id),performance=rank>=0?Math.max(-1,2-rank/5):-.5;
  const ceiling=driver.potentialAbilityMax??driver.potential??driver.currentAbility,room=Math.max(0,ceiling-(driver.currentAbility??70));let growth=0;
  if(driver.age<=rules.youngAgeMax)growth=.7+room/8;else if(driver.age<rules.peakAgeStart)growth=.35+room/12;else if(driver.age<rules.declineAge)growth=.05;else growth=-rules.declineRate*((driver.age-rules.declineAge+2)/8);
  growth+=(driver.morale-70)/55+performance*.18;growth=Math.max(-rules.declineRate,Math.min(rules.maxSeasonGrowth,growth));
  const caChange=growth>0?Math.min(room,Math.max(0,Math.round(growth*(.45+Math.random()*.35)))):Math.round(growth);
  next.currentAbility=clamp((driver.currentAbility??70)+caChange);
  for(const key of core){const variation=(Math.random()-.5)*.8,speedDecline=key==="speed"&&driver.age>=rules.declineAge?-.7:0;next.attributes[key]=clamp(next.attributes[key]+caChange*.55+variation+speedDecline);next[key]=next.attributes[key];}
  next.age++;next.experience=clamp(next.experience+2);next.attributes.raceStarts=clamp(next.attributes.raceStarts+2);next.raceStarts=next.attributes.raceStarts;next.reputation=clamp(next.reputation+performance);next.morale=clamp(next.morale+performance*2+(Math.random()-.5)*3);next.fitness=clamp(next.fitness-Math.max(0,next.age-32)*.4+(Math.random()-.4));next.marketValue=Math.max(150000,Math.round(next.marketValue*(1+caChange/20+performance/40)));
  if(next.age>=34&&next.potentialAbilityMax>next.currentAbility+1)next.potentialAbilityMax=Math.max(next.currentAbility,next.potentialAbilityMax-1);
  if(next.age>=36&&Math.random()<(next.age-35)*.12){next.retired=true;next.teamId=null;next.categoryId="free_agents";}return clampDriverAttributes(next);
});}
