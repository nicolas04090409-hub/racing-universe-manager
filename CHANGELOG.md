# Changelog

## Alpha 0.7.2 — Premium Mobile Experience, mercado estable y progresión satisfactoria

- Corregido el cálculo de interés de pilotos para que nunca muestre `NaN/100`.
- Rebalanceado el interés: reputación del equipo, categoría, contrato, rol, salario, felicidad y rendimiento reciente pesan con más lógica.
- Mercado mobile rediseñado con cards compactas premium: bandera, nombre, equipo, edad, rating, potencial, contrato, salario e interés con barra.
- Rating único visible para pilotos basado en `currentAbility`, con helper centralizado.
- Sponsors ahora entregan bono inmediato al firmar y recalculan ingreso anual/proyección financiera.
- Ingeniería usa un rating global de coche más ponderado y legible.
- Proyectos de desarrollo más cortos, con mejoras más satisfactorias y capacidad por tamaño de equipo.
- Instalaciones más baratas/rápidas y con impacto más claro.
- IA de desarrollo usa reglas comparables, cooldown y capacidad para no progresar injustamente rápido.
- Standings mobile ajustados a filas más compactas.
- README actualizado a Alpha 0.7.2.

## Alpha 0.7.1 — Feedback visual y resultados dinámicos

- Corregido el selector mobile del HUD: Equipo, Campeonato, Finanzas y Actividad cambian realmente la información mostrada.
- Agregado estado de procesamiento para simulación de carrera, fin de semana global, temporada y sesiones de Race Weekend.
- Los resultados de carrera pasan a ser el foco principal automáticamente.
- Nuevo resumen post-carrera con circuito, podio, pilotos del jugador, posiciones ganadas/perdidas y cambios de campeonato.
- Simulación de temporada muestra resumen final y botón para cerrar temporada.
- Race Weekend muestra resúmenes visibles tras práctica, clasificación y carrera por segmentos.
- Paddock Hub muestra card de última carrera con puntos y posición de constructores.
- Microanimaciones breves para cambio de pantalla, HUD, barras, procesamiento y resultado.
- Gráficos simples para evolución técnica, top 5 de campeonato y comparación de pilotos.
- Se mantiene compatibilidad con GitHub Pages y rutas relativas.

## Alpha 0.7.0 — Release Ready y GitHub Pages

- Preparación para publicación como sitio estático en GitHub Pages.
- Rutas relativas revisadas para funcionar dentro de subcarpetas.
- Nombre visible del juego separado de la versión pública.
- Versión centralizada en `appMeta.js`.
- Pantalla inicial mejorada con jerarquía clara: nombre principal y versión secundaria.
- Splash liviano de carga inicial.
- Manejo de error de carga de datos con Reintentar y detalles técnicos.
- Manifest PWA revisado con `start_url` y `scope` relativos.
- Iconos PWA y favicon agregados en `assets/icons/`.
- Página Configuración / Acerca de ampliada con build, formato de guardado y aviso no oficial.
- README profesional con instrucciones de GitHub Pages.
- `.gitignore`, `NOTICE.md` y `LICENSE` agregados.
- Se mantiene launcher local para desarrollo.
- No se agregaron nuevas mecánicas, categorías ni backend.

## Alpha 0.6.x

- Iteraciones de estabilización, balance económico, mercado, sponsors, Race Weekend interactivo básico, UX mobile-first, guardado/carga, historial y mejoras de datos.
