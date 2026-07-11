export const DEFAULT_TEAM_THEME={primaryColor:"#d71920",secondaryColor:"#2aa8ff",accentColor:"#ffffff",textOnPrimary:"#ffffff"};

const THEMES={
  ferrari:{primaryColor:"#DC0000",secondaryColor:"#FFEB00",accentColor:"#ffffff",textOnPrimary:"#ffffff"},
  alpine:{primaryColor:"#1676D2",secondaryColor:"#F48FB1",accentColor:"#ffffff",textOnPrimary:"#ffffff"},
  mclaren:{primaryColor:"#FF8700",secondaryColor:"#47C7FC",accentColor:"#111111",textOnPrimary:"#111111"},
  mercedes:{primaryColor:"#00A19C",secondaryColor:"#C8CCCE",accentColor:"#ffffff",textOnPrimary:"#041412"},
  "red-bull":{primaryColor:"#1E41FF",secondaryColor:"#E10600",accentColor:"#ffffff",textOnPrimary:"#ffffff"},
  williams:{primaryColor:"#005AFF",secondaryColor:"#00A0DE",accentColor:"#ffffff",textOnPrimary:"#ffffff"},
  aston:{primaryColor:"#006F62",secondaryColor:"#CEDC00",accentColor:"#ffffff",textOnPrimary:"#ffffff"},
  audi:{primaryColor:"#BB0A30",secondaryColor:"#111111",accentColor:"#ffffff",textOnPrimary:"#ffffff"},
  cadillac:{primaryColor:"#111111",secondaryColor:"#D4AF37",accentColor:"#ffffff",textOnPrimary:"#ffffff"}
};

function inferTheme(team){
  const haystack=`${team.id} ${team.name} ${team.shortName} ${team.manufacturerPartner??""}`.toLowerCase();
  if(haystack.includes("ferrari"))return THEMES.ferrari;
  if(haystack.includes("alpine"))return THEMES.alpine;
  if(haystack.includes("mclaren"))return THEMES.mclaren;
  if(haystack.includes("mercedes"))return THEMES.mercedes;
  if(haystack.includes("red-bull")||haystack.includes("red bull"))return THEMES["red-bull"];
  if(haystack.includes("williams"))return THEMES.williams;
  if(haystack.includes("aston"))return THEMES.aston;
  if(haystack.includes("audi"))return THEMES.audi;
  if(haystack.includes("cadillac"))return THEMES.cadillac;
  return {primaryColor:team.color??DEFAULT_TEAM_THEME.primaryColor,secondaryColor:DEFAULT_TEAM_THEME.secondaryColor,accentColor:"#ffffff",textOnPrimary:"#ffffff"};
}

export function ensureTeamThemes(world){
  for(const team of world.teams??[])team.theme??=inferTheme(team);
}

export function applyTeamThemeToDocument(team){
  if(typeof document==="undefined"||!team)return;
  const theme=team.theme??inferTheme(team);
  const root=document.documentElement;
  root.style.setProperty("--team-primary",theme.primaryColor);
  root.style.setProperty("--team-secondary",theme.secondaryColor);
  root.style.setProperty("--team-accent",theme.accentColor);
  root.style.setProperty("--team-text-on-primary",theme.textOnPrimary);
}
