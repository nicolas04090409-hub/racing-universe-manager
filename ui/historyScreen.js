import { buildMotorsportArchive } from "../engine/archiveEngine.js";
import { getDriver, getTeam, pageHead, teamChip } from "./helpers.js";

const empty = (text="Sin datos para esta vista todavía.") => `<article class="card empty"><p>${text}</p></article>`;
const driverName = (world,id) => getDriver(world,id)?.name ?? id ?? "—";
const teamName = (world,id) => getTeam(world,id)?.name ?? id ?? "—";
const catName = (world,id) => world.categories.find(c=>c.id===id)?.shortName ?? id ?? "—";

function selectedCategory(world,filters){
  const id=filters.category==="current"||!filters.category?(world.viewCategoryId??world.currentCategoryId):filters.category;
  return world.categories.find(c=>c.id===id)??world.categories[0];
}

function selectorBar(world,filters,seasons){
  const seasonOptions=[`<option value="all" ${filters.season==="all"?"selected":""}>Todas las temporadas</option>`,...seasons.map(s=>`<option value="${s}" ${String(filters.season)===String(s)?"selected":""}>${s}</option>`)].join("");
  return `<div class="toolbar history-toolbar">
    <label><span>Modo</span><select data-history-filter="mode"><option value="universe" ${filters.mode==="universe"?"selected":""}>Universo del save</option><option value="real" ${filters.mode==="real"?"selected":""}>Historia real / previa</option></select></label>
    <label><span>Categoría</span><select data-history-filter="category"><option value="current" ${filters.category==="current"?"selected":""}>Categoría actual</option>${world.categories.map(c=>`<option value="${c.id}" ${filters.category===c.id?"selected":""}>${c.name}</option>`).join("")}</select></label>
    <label><span>Temporada</span><select data-history-filter="season">${seasonOptions}</select></label>
  </div>`;
}

function tabs(active){
  const items=[["summary","Resumen"],["champions","Campeones"],["drivers","Pilotos"],["teams","Equipos"],["races","Carreras"],["transfers","Transferencias"],["news","Noticias históricas"],["records","Récords"]];
  return `<div class="tabs history-tabs">${items.map(([id,label])=>`<button class="tab ${active===id?"active":""}" data-action="history-tab" data-tab="${id}">${label}</button>`).join("")}</div>`;
}

function universeRows(world,category,filters){
  const all=world.history?.seasons??[];
  return all
    .filter(s=>filters.season==="all"||String(s.season)===String(filters.season))
    .map(s=>({season:s.season,category:s.categories?.[category.id]}))
    .filter(r=>r.category);
}

function realEntry(data,categoryId){
  return (data.historicalChampions??[]).find(h=>h.categoryId===categoryId)??null;
}

function recordsTable(world,rows,kind,valueKey,label){
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>${kind==="team"?"Equipo":"Piloto"}</th><th>${label}</th><th>Temp.</th></tr></thead><tbody>${(rows??[]).slice(0,10).map((row,i)=>`<tr><td class="pos">${i+1}</td><td>${kind==="team"?teamName(world,row.id):driverName(world,row.id)}</td><td>${row[valueKey]??0}</td><td>${row.seasons??"—"}</td></tr>`).join("")||`<tr><td colspan="4" class="empty-cell">Sin registros.</td></tr>`}</tbody></table></div>`;
}

function renderUniverse(world,data,category,filters,archive){
  const rows=universeRows(world,category,filters);
  const latest=rows.at(-1);
  if(filters.tab==="summary"){
    return rows.length?`<div class="grid four">
      <article class="card metric-card"><div class="metric-label">Temporadas</div><div class="metric-value small">${rows.length}</div><p>Archivadas para ${category.shortName}</p></article>
      <article class="card metric-card"><div class="metric-label">Último campeón</div><div class="metric-value small">${driverName(world,latest.category.driversChampion)}</div><p>Pilotos · ${latest.season}</p></article>
      <article class="card metric-card"><div class="metric-label">Equipo campeón</div><div class="metric-value small">${teamName(world,latest.category.teamsChampion)}</div><p>Constructores · ${latest.season}</p></article>
      <article class="card metric-card"><div class="metric-label">Carreras</div><div class="metric-value small">${latest.category.raceResults?.length??0}</div><p>Resultados guardados</p></article>
    </div>
    <article class="card helper"><h3>Qué podés hacer</h3><p>Usá los filtros para cambiar entre historia del save e historia real. Las pestañas separan campeones, tablas, carreras, movimientos, noticias y récords para que el archivo no quede mezclado.</p></article>`:empty(`Todavía no hay temporadas cerradas para ${category.name}.`);
  }
  if(filters.tab==="champions"){
    return rows.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Temporada</th><th>Categoría</th><th>Campeón pilotos</th><th>Campeón equipos</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.season}</td><td>${category.shortName}</td><td>${driverName(world,r.category.driversChampion)}</td><td>${teamChip(getTeam(world,r.category.teamsChampion))}</td></tr>`).join("")}</tbody></table></div>`:empty();
  }
  if(filters.tab==="drivers"){
    const row=latest?.category;
    return row?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Pos</th><th>Piloto</th><th>Puntos</th><th>Victorias</th><th>Podios</th></tr></thead><tbody>${(row.driverStandings??[]).map(r=>`<tr><td class="pos">${r.position}</td><td>${driverName(world,r.driverId)}</td><td>${r.points??0}</td><td>${r.wins??0}</td><td>${r.podiums??0}</td></tr>`).join("")}</tbody></table></div>`:empty("Cerrá una temporada para archivar posiciones de pilotos.");
  }
  if(filters.tab==="teams"){
    const row=latest?.category;
    return row?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Pos</th><th>Equipo</th><th>Puntos</th><th>Victorias</th><th>Podios</th></tr></thead><tbody>${(row.teamStandings??[]).map(r=>`<tr><td class="pos">${r.position}</td><td>${teamChip(getTeam(world,r.teamId))}</td><td>${r.points??0}</td><td>${r.wins??0}</td><td>${r.podiums??0}</td></tr>`).join("")}</tbody></table></div>`:empty("Cerrá una temporada para archivar posiciones de equipos.");
  }
  if(filters.tab==="races"){
    const races=rows.flatMap(row=>(row.category.raceResults??[]).map(r=>({...r,season:row.season})));
    return races.length?`<div class="grid two">${races.map(r=>{const circuit=data.circuits.find(c=>c.id===r.circuitId);const podium=(r.results??[]).slice(0,3).map(x=>driverName(world,x.driverId)).join(" · ");return`<article class="card"><span class="pill">${r.season} · R${r.round}</span><h3>${circuit?.name??r.circuitId}</h3><p>Ganador: <strong>${driverName(world,r.results?.[0]?.driverId??r.winnerDriverId)}</strong></p><p class="muted">Podio: ${podium||"Sin datos"}${r.safetyCar?" · Safety Car":""}</p></article>`;}).join("")}</div>`:empty("No hay carreras archivadas para esta selección.");
  }
  if(filters.tab==="transfers"){
    const transfers=archive.timeline.transfers.filter(t=>t.categoryId===category.id&&(filters.season==="all"||String(t.season)===String(filters.season)));
    const retired=archive.timeline.retired.filter(t=>t.categoryId===category.id&&(filters.season==="all"||String(t.season)===String(filters.season)));
    return `<div class="grid two"><article class="card"><h3>Transferencias / promociones</h3>${transfers.map(t=>`<div class="standing-line"><b>${t.season}</b><span>${t.text}</span><strong>${catName(world,t.categoryId)}</strong></div>`).join("")||`<p class="muted">Sin movimientos archivados.</p>`}</article><article class="card"><h3>Retiros</h3>${retired.map(t=>`<div class="standing-line"><b>${t.season}</b><span>${driverName(world,t.driverId)}</span><strong>${catName(world,t.categoryId)}</strong></div>`).join("")||`<p class="muted">Sin retiros archivados.</p>`}</article></div>`;
  }
  if(filters.tab==="news"){
    const news=archive.timeline.news.filter(n=>!n.categoryId||n.categoryId===category.id).filter(n=>filters.season==="all"||String(n.season)===String(filters.season));
    return news.length?`<div class="grid two">${news.map(n=>`<article class="card"><span class="pill">${n.season}</span><h3>${n.headline??n.title??"Noticia histórica"}</h3><p>${n.body??n.text??n.summary??""}</p></article>`).join("")}</div>`:empty("Sin noticias históricas para esta selección.");
  }
  return `<div class="grid two">
    <article class="card"><h3>Pilotos con más títulos</h3>${recordsTable(world,archive.records.driverTitles,"driver","championships","Títulos")}</article>
    <article class="card"><h3>Equipos con más títulos</h3>${recordsTable(world,archive.records.teamTitles,"team","championships","Títulos")}</article>
    <article class="card"><h3>Pilotos con más victorias</h3>${recordsTable(world,archive.records.driverWins,"driver","wins","Victorias")}</article>
    <article class="card"><h3>Equipos con más victorias</h3>${recordsTable(world,archive.records.teamWins,"team","wins","Victorias")}</article>
  </div>`;
}

function countBy(items,key){
  return items.reduce((map,item)=>map.set(item[key],(map.get(item[key])??0)+1),new Map());
}

function renderReal(world,data,category,filters){
  const real=realEntry(data,category.id);
  if(!real)return empty(`Todavía no hay historia real/preexistente cargada para ${category.name}.`);
  const champions=(real.champions??[]).filter(r=>filters.season==="all"||String(r.season)===String(filters.season));
  if(filters.tab==="summary"){
    const latest=champions.at(-1);
    const most=[...countBy(champions,"driversChampion").entries()].sort((a,b)=>b[1]-a[1])[0];
    return `<div class="grid four">
      <article class="card metric-card"><div class="metric-label">Base</div><div class="metric-value small">${real.realWorldEquivalent}</div><p>Historia real/preexistente</p></article>
      <article class="card metric-card"><div class="metric-label">Campeonatos</div><div class="metric-value small">${champions.length}</div><p>Registros cargados</p></article>
      <article class="card metric-card"><div class="metric-label">Último campeón</div><div class="metric-value small">${latest?.driversChampion??"—"}</div><p>${latest?.season??"Sin año"}</p></article>
      <article class="card metric-card"><div class="metric-label">Más títulos</div><div class="metric-value small">${most?.[0]??"—"}</div><p>${most?.[1]??0} título(s)</p></article>
    </div><article class="card helper"><h3>Nota</h3><p>Esta sección es de referencia histórica. No modifica tu save ni mezcla resultados reales con el universo simulado.</p></article>`;
  }
  if(filters.tab==="champions"){
    return champions.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Año</th><th>Campeón de pilotos</th><th>Campeón de constructores</th><th>Nota</th></tr></thead><tbody>${champions.slice().reverse().map(r=>`<tr><td>${r.season}</td><td>${r.driversChampion}</td><td>${r.teamsChampion??"—"}</td><td>${r.notes??""}</td></tr>`).join("")}</tbody></table></div>`:empty("No hay campeones para esa temporada.");
  }
  if(filters.tab==="news"){
    return (real.news??[]).length?`<div class="grid two">${real.news.map(n=>`<article class="card"><span class="pill">${n.season}</span><h3>${n.title}</h3><p>${n.summary??""}</p></article>`).join("")}</div>`:empty("Sin noticias históricas reales cargadas.");
  }
  if(filters.tab==="records"){
    const driverTitles=[...countBy(champions,"driversChampion").entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
    const teamTitles=[...countBy(champions.filter(c=>c.teamsChampion),"teamsChampion").entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
    return `<div class="grid two"><article class="card"><h3>Pilotos con más campeonatos</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Piloto</th><th>Títulos</th></tr></thead><tbody>${driverTitles.map(([name,count],i)=>`<tr><td class="pos">${i+1}</td><td>${name}</td><td>${count}</td></tr>`).join("")}</tbody></table></div></article><article class="card"><h3>Constructores con más campeonatos</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Equipo</th><th>Títulos</th></tr></thead><tbody>${teamTitles.map(([name,count],i)=>`<tr><td class="pos">${i+1}</td><td>${name}</td><td>${count}</td></tr>`).join("")||`<tr><td colspan="3" class="empty-cell">Sin constructores cargados.</td></tr>`}</tbody></table></div></article></div>`;
  }
  return empty("Esta pestaña todavía no tiene detalle real cargado para esta categoría. Usá Campeones, Noticias históricas o Récords.");
}

export function renderHistoryScreen(world,data={},filters={}){
  const archive=buildMotorsportArchive(world);
  const normalized={mode:"universe",category:"current",season:"all",tab:"summary",...filters};
  const category=selectedCategory(world,normalized);
  const seasonSet=new Set((world.history?.seasons??[]).map(s=>s.season));
  for(const r of realEntry(data,category.id)?.champions??[])seasonSet.add(r.season);
  const seasons=[...seasonSet].sort((a,b)=>b-a);
  return `${pageHead("Motorsport Archive",`${category.name} · ${normalized.mode==="real"?"Historia real / previa":"Universo de la partida"}`,selectorBar(world,normalized,seasons))}
  ${tabs(normalized.tab)}
  ${normalized.mode==="real"?renderReal(world,data,category,normalized):renderUniverse(world,data,category,normalized,archive)}`;
}
