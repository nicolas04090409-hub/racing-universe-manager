export const money=value=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"USD",maximumFractionDigits:0,notation:value>=1e7?"compact":"standard"}).format(value??0);
export const formatMoneyCompact=value=>{
  const v=Number(value??0),abs=Math.abs(v),sign=v<0?"-":"";
  if(abs>=1e6)return`${sign}US$ ${(abs/1e6).toFixed(abs>=1e7?1:1)}M`;
  if(abs>=1e3)return`${sign}US$ ${Math.round(abs/1e3)}k`;
  return`${sign}US$ ${Math.round(abs)}`;
};
export const number=value=>new Intl.NumberFormat("es-AR").format(value??0);
export const getTeam=(world,id)=>world.teams.find(team=>team.id===id);
export const getDriver=(world,id)=>world.drivers.find(driver=>driver.id===id);
export const getCategory=world=>world.categories.find(category=>category.id===(world.viewCategoryId??world.currentCategoryId));
export const getUserCategory=world=>world.categories.find(category=>category.id===getTeam(world,world.userTeamId)?.categoryId);
export const getCategoryState=(world,id=world.viewCategoryId??world.currentCategoryId)=>world.categoryStates[id];
export const userTeam=world=>getTeam(world,world.userTeamId);
export const teamName=(world,id)=>getTeam(world,id)?.name??"Sin equipo";
export const progress=(label,value,tone="")=>`<div class="stat-row"><span>${label}</span><div class="progress ${tone}"><span style="width:${Math.max(0,Math.min(100,Number(value)||0))}%"></span></div><strong>${Math.round(Number(value)||0)}</strong></div>`;
export const teamChip=team=>`<span class="team-chip" style="--team-color:${team?.color??"#687384"}"><i class="team-color"></i>${team?.name??"Libre"}</span>`;
export function pageHead(title,subtitle,action=""){return`<div class="section-head"><div><h2>${title}</h2><p>${subtitle}</p></div>${action}</div>`;}
export const driverOverall=driver=>driver.currentAbility??Math.round(driver.attributes.speed*.2+driver.attributes.racePace*.2+driver.attributes.qualifying*.12+driver.attributes.consistency*.12+driver.attributes.overtaking*.08+driver.attributes.tyreManagement*.08+driver.experience*.1+(driver.potentialAbilityMax??driver.potential)*.1);
export const potentialStars=driver=>{const value=Math.max(1,Math.min(5,driver.potentialStarsVisible??3));const full=Math.floor(value),half=value%1>=.5;return"★".repeat(full)+(half?"½":"")+"☆".repeat(Math.max(0,5-full-(half?1:0)));};
export const scoutConfidence=(driver,team=null)=>Math.max(35,Math.min(95,Math.round((driver.reputation??50)*.35+(team?.staffModifiers?.scouting??0)*3+(team?.facilities?.simulator??5)*3+(driver.generated?8:18))));
export function developmentStatus(driver){
  const age=driver.age??25,ca=driver.currentAbility??70,min=driver.potentialAbilityMin??driver.potentialAbilityMax??ca,max=driver.potentialAbilityMax??driver.potential??ca;
  if(age>=38)return{label:"En declive",tone:"bad",text:"Veterano cerca del final de carrera; el crecimiento ya no es el foco."};
  if(age>=36)return{label:"Veterano consolidado",tone:"warn",text:"Mantiene nivel alto, pero con margen limitado y riesgo de declive."};
  if(max>=95&&age<=25)return{label:"Talento generacional",tone:"good",text:"Techo excepcional si recibe entorno, minutos y desarrollo correctos."};
  if(ca>=max-1)return{label:"Ya alcanzó su potencial",tone:"info",text:"Está prácticamente en su techo estimado."};
  if(ca>=min-1)return{label:"Cerca de su techo",tone:"warn",text:"Todavía puede pulir detalles, pero el salto grande parece limitado."};
  if(age<=24&&max-ca>=8)return{label:"En desarrollo",tone:"good",text:"Tiene margen importante de crecimiento."};
  if((driver.generated||driver.scoutNoise)&&max-ca>=6)return{label:"Potencial incierto",tone:"info",text:"El rango de scouting todavía tiene ruido."};
  return{label:"Margen moderado",tone:"info",text:"Puede mejorar con buen contexto, aunque sin salto garantizado."};
}
export function potentialRating(driver){return Math.max(1,Math.min(5,Number(driver.potentialStarsVisible??Math.round(((driver.potentialAbilityMax??75)-55)/9))));}
export function potentialLabel(driver){const value=potentialRating(driver);return`${value.toFixed(1)}/5`;}
export function potentialSummary(driver,team=null){const status=developmentStatus(driver),confidence=scoutConfidence(driver,team),min=driver.potentialAbilityMin??driver.currentAbility??"?",max=driver.potentialAbilityMax??driver.potential??"?";return{...status,confidence,range:`${min}–${max}`,rating:potentialLabel(driver)};}
export function potentialBadge(driver,team=null){const p=potentialSummary(driver,team);return`<div class="potential-box"><span class="pill ${p.tone}">${p.rating}</span><strong>${p.label}</strong><small>${p.text}</small><small>Rango estimado ${p.range} · Confianza ${p.confidence}%</small></div>`;}export const initials=name=>(name??"?").split(" ").map(part=>part[0]).slice(0,2).join("");
export const roundIndex=world=>getCategoryState(world)?.currentRound-1;
export const fakeDate=(season,round)=>new Date(season,2+(round-1),10+(round*3)%17).toLocaleDateString("es-AR",{day:"2-digit",month:"short"});

