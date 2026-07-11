import { initials,progress } from "./helpers.js";
export const badge=(text,tone="")=>`<span class="pill ${tone}">${text}</span>`;
export const avatar=(driver,size="")=>`<div class="avatar ${size}" aria-hidden="true">${initials(driver.name)}</div>`;
export const metricCard=(label,value,detail="",tone="")=>`<article class="card metric-card"><div class="metric-label">${label}</div><div class="metric-value ${tone}">${value}</div>${detail?`<p>${detail}</p>`:""}</article>`;
export const performanceGrid=items=>`<div class="performance-grid">${items.map(([label,value,tone])=>progress(label,value,tone)).join("")}</div>`;
export const newsItem=item=>`<article class="news-item ${item.tone??""}"><span class="news-signal"></span><div><strong>${item.title}</strong><p>${item.body}</p><small>Temporada ${item.season}${item.round?` · Ronda ${item.round}`:""}</small></div></article>`;
export const emptyState=(title,body)=>`<div class="empty card"><div><h2>${title}</h2><p>${body}</p></div></div>`;
export const filterButton=(id,label,active)=>`<button class="filter-chip ${active?"active":""}" data-action="market-filter" data-filter="${id}">${label}</button>`;
