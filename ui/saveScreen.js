import { BUILD_LABEL, SAVE_FORMAT_VERSION } from "../appMeta.js";
import { getCategoryState, getUserCategory, pageHead, userTeam } from "./helpers.js";

export function renderSaveScreen(world) {
  const category = getUserCategory(world);
  const state = getCategoryState(world, category.id);
  const team = userTeam(world);
  return `${pageHead("Configuración de partida", "Persistencia local del mundo vivo")}
  <div class="grid two">
    <article class="card save-card"><div class="save-icon">◆</div><div><span class="metric-label">PARTIDA ACTIVA · ${BUILD_LABEL}</span><h2>${team.name}</h2><p>${category.name} · Temporada ${world.currentSeason} · Ronda ${state.currentRound} de ${category.calendar.length}<br>Universo: ${world.categories.length} categorías · ${world.teams.length} equipos · ${world.drivers.filter(d => !d.retired).length} pilotos · ${(world.staff ?? []).length} staff<br>Relaciones: ${(world.relationships ?? []).length} · World tick: ${world.worldTick ?? 0} · Race Weekend: ${world.activeWeekend ? world.activeWeekend.stage : "sin activo"} · Historial: ${(world.history?.seasons ?? []).length} temporadas<br>Actualizada: ${new Date(world.updatedAt).toLocaleString("es-AR")}</p><button class="button primary" data-action="save">Guardar ahora</button></div></article>
    <article class="card"><span class="metric-label">COMPATIBILIDAD</span><h2>Formato de guardado ${SAVE_FORMAT_VERSION}</h2><p>Las partidas se guardan localmente en este navegador. Una partida creada en localhost no aparece automáticamente en GitHub Pages porque son orígenes distintos.</p><div class="actions"><button class="button" data-action="load">Cargar slot</button><button class="button danger" data-action="delete-save">Borrar slot</button></div></article>
  </div>`;
}
