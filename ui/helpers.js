export const safeNumber=(value,fallback=0)=>{const number=Number(value);return Number.isFinite(number)?number:fallback;};
export const clampNumber=(value,min=0,max=100)=>Math.max(min,Math.min(max,safeNumber(value,min)));
export const money=value=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:0,notation:safeNumber(value,0)>=1e7?"compact":"standard"}).format(safeNumber(value,0));
export const formatMoneyCompact=value=>{
  const v=safeNumber(value,0),abs=Math.abs(v),sign=v<0?"-":"";
  if(abs>=1e6)return`${sign}US$ ${(abs/1e6).toFixed(1)}M`;
  if(abs>=1e3)return`${sign}US$ ${Math.round(abs/1e3)}k`;
  return`${sign}US$ ${Math.round(abs)}`;
};
export const number=value=>new Intl.NumberFormat("es-AR").format(safeNumber(value,0));
export const getTeam=(world,id)=>world.teams.find(team=>team.id===id);
export const getDriver=(world,id)=>world.drivers.find(driver=>driver.id===id);
export const getCategory=world=>world.categories.find(category=>category.id===(world.viewCategoryId??world.currentCategoryId));
export const getUserCategory=world=>world.categories.find(category=>category.id===getTeam(world,world.userTeamId)?.categoryId);
export const getCategoryState=(world,id=world.viewCategoryId??world.currentCategoryId)=>world.categoryStates[id];
export const userTeam=world=>getTeam(world,world.userTeamId);
export const teamName=(world,id)=>getTeam(world,id)?.name??"Sin equipo";
export const progress=(label,value,tone="")=>`<div class="stat-row"><span>${label}</span><div class="progress ${tone}"><span style="width:${clampNumber(value)}%"></span></div><strong>${Math.round(safeNumber(value,0))}</strong></div>`;
export const teamChip=team=>`<span class="team-chip" style="--team-color:${team?.color??"#687384"}"><i class="team-color"></i>${team?.name??"Libre"}</span>`;
export function pageHead(title,subtitle,action=""){return`<div class="section-head"><div><h2>${title}</h2><p>${subtitle}</p></div>${action}</div>`;}
export function getDriverOverallRating(driver){
  const attrs=driver?.attributes??{};
  const fallback=
    safeNumber(attrs.speed,65)*.2+
    safeNumber(attrs.racePace,65)*.2+
    safeNumber(attrs.qualifying,65)*.12+
    safeNumber(attrs.consistency,65)*.12+
    safeNumber(attrs.overtaking,65)*.08+
    safeNumber(attrs.tyreManagement,65)*.08+
    safeNumber(driver?.experience,50)*.1+
    safeNumber(driver?.potentialAbilityMax??driver?.potential,70)*.1;
  return Math.round(clampNumber(driver?.currentAbility??fallback,1,100));
}
export const driverOverall=getDriverOverallRating;
export function interestLabel(score){
  const value=clampNumber(score,0,100);
  if(value>=85)return"Muy interesado";
  if(value>=70)return"Interesado";
  if(value>=55)return"Escuchará una oferta";
  if(value>=40)return"Difícil";
  if(value>=20)return"Muy difícil";
  return"No interesado";
}
export function interestTone(score){
  const value=clampNumber(score,0,100);
  if(value>=70)return"good";
  if(value>=55)return"info";
  if(value>=40)return"warn";
  return"bad";
}
export const potentialStars=driver=>{const value=Math.max(1,Math.min(5,safeNumber(driver?.potentialStarsVisible,3)));const full=Math.floor(value),half=value%1>=.5;return"★".repeat(full)+(half?"½":"")+"☆".repeat(Math.max(0,5-full-(half?1:0)));};
export const scoutConfidence=(driver,team=null)=>Math.max(35,Math.min(95,Math.round(safeNumber(driver?.reputation,50)*.35+safeNumber(team?.staffModifiers?.scouting,0)*3+safeNumber(team?.facilities?.simulator,5)*3+(driver?.generated?8:18))));
export function developmentStatus(driver){
  const age=safeNumber(driver?.age,25),ca=getDriverOverallRating(driver),min=safeNumber(driver?.potentialAbilityMin??driver?.potentialAbilityMax,ca),max=safeNumber(driver?.potentialAbilityMax??driver?.potential,ca);
  if(age>=38)return{label:"En declive",tone:"bad",text:"Veterano cerca del final de carrera; el crecimiento ya no es el foco."};
  if(age>=36)return{label:"Veterano consolidado",tone:"warn",text:"Mantiene nivel alto, pero con margen limitado y riesgo de declive."};
  if(max>=95&&age<=25)return{label:"Talento generacional",tone:"good",text:"Techo excepcional si recibe entorno, minutos y desarrollo correctos."};
  if(ca>=max-1)return{label:"Ya alcanzó su potencial",tone:"info",text:"Está prácticamente en su techo estimado."};
  if(ca>=min-1)return{label:"Cerca de su techo",tone:"warn",text:"Todavía puede pulir detalles, pero el salto grande parece limitado."};
  if(age<=24&&max-ca>=8)return{label:"En desarrollo",tone:"good",text:"Tiene margen importante de crecimiento."};
  if((driver?.generated||driver?.scoutNoise)&&max-ca>=6)return{label:"Potencial incierto",tone:"info",text:"El rango de scouting todavía tiene ruido."};
  return{label:"Margen moderado",tone:"info",text:"Puede mejorar con buen contexto, aunque sin salto garantizado."};
}
export function potentialRating(driver){return Math.max(1,Math.min(5,safeNumber(driver?.potentialStarsVisible,Math.round((safeNumber(driver?.potentialAbilityMax,75)-55)/9))));}
export function potentialLabel(driver){const value=potentialRating(driver);return`${value.toFixed(1)}/5`;}
export function potentialSummary(driver,team=null){const status=developmentStatus(driver),confidence=scoutConfidence(driver,team),min=driver?.potentialAbilityMin??driver?.currentAbility??"?",max=driver?.potentialAbilityMax??driver?.potential??"?";return{...status,confidence,range:`${min}–${max}`,rating:potentialLabel(driver)};}
export function potentialBadge(driver,team=null){const p=potentialSummary(driver,team);return`<div class="potential-box"><span class="pill ${p.tone}">${p.rating}</span><strong>${p.label}</strong><small>${p.text}</small><small>Rango estimado ${p.range} · Confianza ${p.confidence}%</small></div>`;}
export const initials=name=>(name??"?").split(" ").map(part=>part[0]).slice(0,2).join("");
export const roundIndex=world=>getCategoryState(world)?.currentRound-1;
export const fakeDate=(season,round)=>new Date(season,2+(round-1),10+(round*3)%17).toLocaleDateString("es-AR",{day:"2-digit",month:"short"});
