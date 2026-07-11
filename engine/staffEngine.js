const avg=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:50;
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(v)));
export const staffRoleLabels={team_principal:"Team Principal",sporting_director:"Director deportivo",technical_director:"Director técnico",chief_engineer:"Ingeniero jefe",race_engineer:"Ingeniero de pista",performance_engineer:"Ingeniero performance",head_of_aero:"Jefe de aero",head_of_engine:"Jefe de motor",strategy_director:"Director estrategia",pit_crew_chief:"Jefe de boxes",scouting_director:"Director scouting",academy_director:"Director academia",fitness_coach:"Preparador físico",sports_psychologist:"Psicólogo deportivo",commercial_director:"Director comercial"};

export function getTeamStaff(world, teamId){return (world.staff??[]).filter(s=>s.teamId===teamId);}
export function staffByRole(world, teamId, role){return getTeamStaff(world,teamId).find(s=>s.role===role);}
const attr=(member,key)=>member?.attributes?.[key]??member?.[key]??member?.currentAbility??50;

export function calculateStaffModifiers(team, gameState) {
  const staff=getTeamStaff(gameState,team.id);
  const m=(role,key)=>attr(staff.find(s=>s.role===role),key);
  const leadership=avg([m("team_principal","leadership"),m("sporting_director","leadership")]);
  const technical=avg([m("technical_director","technicalKnowledge"),m("chief_engineer","technicalKnowledge")]);
  const modifiers={
    leadership:clamp((leadership-50)/10,-5,8),
    aeroDevelopment:clamp((m("head_of_aero","aerodynamics")+technical-100)/9,-4,10),
    engineDevelopment:clamp((m("head_of_engine","engineKnowledge")+technical-100)/9,-4,10),
    chassisDevelopment:clamp((m("chief_engineer","chassisKnowledge")+technical-100)/9,-4,10),
    strategy:clamp((m("strategy_director","raceStrategy")-50)/8,-5,9),
    setup:clamp((m("race_engineer","dataAnalysis")+m("performance_engineer","dataAnalysis")-100)/10,-4,9),
    driverDevelopment:clamp((m("academy_director","driverDevelopment")+m("sports_psychologist","moraleManagement")-100)/10,-4,9),
    scouting:clamp((m("scouting_director","scouting")-50)/8,-5,9),
    negotiation:clamp((m("sporting_director","negotiation")-50)/8,-5,8),
    commercial:clamp((m("commercial_director","commercial")-50)/8,-5,10),
    morale:clamp((m("sports_psychologist","moraleManagement")+leadership-100)/10,-4,9),
    fitness:clamp((m("fitness_coach","pressureManagement")-50)/8,-4,8),
    reliability:clamp((m("chief_engineer","reliabilityFocus")+m("head_of_engine","reliabilityFocus")-100)/10,-4,9),
    pitCrew:clamp((m("pit_crew_chief","pitStopTraining")-50)/8,-5,10)
  };
  team.staffModifiers=modifiers;
  return modifiers;
}

export function applyStaffModifiers(world){
  for(const team of world.teams) calculateStaffModifiers(team,world);
}
