import { pageHead } from "./helpers.js";
import { newsItem } from "./components.js";

const option=(value,label,current)=>`<option value="${value}" ${current===value?"selected":""}>${label}</option>`;

export function renderNewsScreen(world,filters={type:"all",category:"all",priority:"all"}){
  const types=[...new Set((world.news??[]).map(n=>n.type??"General"))].sort();
  const filtered=(world.news??[]).filter(n=>{
    if(filters.type!=="all"&&(n.type??"General")!==filters.type)return false;
    if(filters.category!=="all"&&n.categoryId!==filters.category)return false;
    if(filters.priority!=="all"&&(n.priority??"normal")!==filters.priority)return false;
    return true;
  });
  const featured=filtered.find(n=>["result","positive","warning"].includes(n.tone))??filtered[0];
  return`${pageHead("Centro de noticias",`${filtered.length} noticias · Temporada ${world.currentSeason}`)}
  <div class="scouting-toolbar">
    <label class="scout-filter"><span>Tipo</span><select data-news-filter="type">${[["all","Todos"],...types.map(t=>[t,t])].map(v=>option(v[0],v[1],filters.type)).join("")}</select></label>
    <label class="scout-filter"><span>Categoría</span><select data-news-filter="category">${[["all","Todas"],...world.categories.map(c=>[c.id,c.shortName])].map(v=>option(v[0],v[1],filters.category)).join("")}</select></label>
    <label class="scout-filter"><span>Prioridad</span><select data-news-filter="priority">${[["all","Todas"],["normal","Normal"],["high","Alta"]].map(v=>option(v[0],v[1],filters.priority)).join("")}</select></label>
  </div>
  ${featured?`<article class="card news-feature"><span class="pill ${featured.tone}">${featured.type??"General"}</span><h2>${featured.title}</h2><p>${featured.body}</p><small>Semana ${featured.week??0} · Temporada ${featured.season}</small></article>`:""}
  <div class="news-feed">${filtered.map(newsItem).join("")||`<article class="card">No hay noticias para estos filtros.</article>`}</div>`;
}
