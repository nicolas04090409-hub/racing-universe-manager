import { APP_NAME, BUILD_DATE, BUILD_LABEL, OFFICIAL_NOTICE, SAVE_FORMAT_VERSION } from "../appMeta.js";
import { pageHead } from "./helpers.js";

export function renderSettingsScreen(world) {
  return `${pageHead("Configuración / Acerca de", "Preferencias de interfaz, versión y créditos")}
  <div class="grid two">
    <article class="card setting-row"><div><h3>Guardado automático</h3><p>La partida se guarda localmente después de cada acción importante.</p></div><span class="toggle on">ON</span></article>
    <article class="card setting-row"><div><h3>Tema visual</h3><p>Interfaz premium oscura con identidad visual por equipo.</p></div><span class="pill good">RACING DARK</span></article>
    <article class="card setting-row"><div><h3>Rol del usuario</h3><p>Define las responsabilidades disponibles.</p></div><span class="pill">${world.userRole}</span></article>
    <article class="card setting-row"><div><h3>Formato de guardado</h3><p>Versión interna de persistencia. No siempre coincide con la versión pública del juego.</p></div><span class="pill">save ${SAVE_FORMAT_VERSION}</span></article>
  </div>
  <article class="card about-card">
    <span class="metric-label">ACERCA DE</span>
    <h2>${APP_NAME}</h2>
    <p><strong>${BUILD_LABEL}</strong> · Build ${BUILD_DATE}</p>
    <p>Juego de gestión de automovilismo en desarrollo. Funciona como sitio estático: HTML, CSS, JavaScript y JSON, sin backend ni compilación.</p>
    <div class="grid two">
      <div><span class="metric-label">GUARDADO</span><p>Las partidas se guardan en LocalStorage del navegador y dispositivo actual. No se sincronizan automáticamente entre celulares o computadoras.</p></div>
      <div><span class="metric-label">CRÉDITOS</span><p>Diseño, simulación y datos curados para un prototipo Alpha independiente.</p></div>
    </div>
  </article>
  <article class="card notice"><strong>Aviso no oficial</strong><p>${OFFICIAL_NOTICE}</p></article>`;
}
