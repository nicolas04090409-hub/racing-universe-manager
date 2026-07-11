# Racing Universe Manager

Juego web de gestión de automovilismo inspirado en simuladores de management deportivo. Permite dirigir un equipo, gestionar pilotos, finanzas, sponsors, ingeniería, mercado, Race Weekend e historial dentro de un universo multicategoría.

## Estado del proyecto

Alpha v0.7.3 — UTF-8, HUD mobile funcional y clasificaciones completas.

La versión visible del juego se centraliza en `appMeta.js`. El formato interno de guardado puede tener una versión distinta.

## Funcionalidades actuales

- Universo multicategoría con equipos, pilotos y calendarios.
- Paddock Hub, navegación desktop y mobile-first.
- HUD mobile con selector funcional: Equipo, Campeonato, Finanzas y Actividad.
- Race Weekend con resúmenes visibles de práctica, clasificación y carrera.
- Carrera rápida con estado de procesamiento y resumen post-carrera inmediato.
- Mercado premium mobile con interés estable, sin `NaN/100`, rating único visible y barras de interés.
- Sponsors con bono inmediato al firmar, ingreso anual y recálculo financiero.
- Finanzas, contratos, staff, sponsors e ingeniería integrados.
- Ingeniería con proyectos más rápidos, capacidad clara, instalaciones más accesibles e impacto visible contra rivales.
- Textos normalizados en UTF-8 para local y GitHub Pages.
- HUD mobile funcional con grupos Equipo, Campeonato, Finanzas y Actividad.
- Resultados y clasificaciones completas con soporte para grillas variables de 20, 22 o más pilotos.
- Gráficos simples de campeonato, evolución técnica y comparación de pilotos.
- PWA básica con manifest, favicon e iconos.
- Guardado/carga local mediante LocalStorage.

## Flujo de carrera

Al tocar `Simular próxima carrera`, el juego muestra un estado breve de procesamiento, evita dobles toques y luego enfoca automáticamente el resultado:

- circuito, categoría, ronda, clima y vueltas;
- ganador y podio;
- resultado de pilotos del jugador;
- posiciones ganadas/perdidas;
- puntos sumados;
- cambios de campeonato;
- acciones para ver clasificación completa, campeonato, Paddock o estrategia.

## Uso mobile

En celular, las acciones importantes priorizan:

1. resultado;
2. consecuencia;
3. siguiente acción.

El HUD superior se puede alternar entre Equipo, Campeonato, Finanzas y Actividad sin recargar la página.

## Cómo jugar localmente

1. Abrí la carpeta `racing-universe-manager`.
2. Hacé doble click en `Iniciar Racing Universe Manager.bat`.
3. El launcher abre `http://localhost:8000` o `http://localhost:8010`.

O manualmente:

```bash
python -m http.server 8000
```

## Cómo publicar en GitHub Pages

1. Crear un repositorio en GitHub.
2. Subir todos los archivos de `racing-universe-manager/`.
3. Ir a `Settings`.
4. Entrar en `Pages`.
5. Seleccionar `Deploy from a branch`.
6. Elegir branch `main` y folder `/root`.
7. Guardar.
8. Abrir la URL generada.

El proyecto no requiere Node.js, npm, backend ni compilación.

Después de subir una nueva versión:

1. Esperar el despliegue de GitHub Pages.
2. Abrir en incógnito o recargar sin caché.
3. Verificar que la pantalla muestre la versión visible correcta.

## Guardado de partidas

Las partidas se guardan localmente en el dispositivo y navegador actual mediante LocalStorage.

No se sincronizan automáticamente entre celulares o computadoras. Una partida creada en `http://localhost:8000` no aparece automáticamente en `https://usuario.github.io/racing-universe-manager/` porque son orígenes distintos.

## Aviso legal/no oficial

Racing Universe Manager es un proyecto independiente y no oficial. No está afiliado, respaldado ni asociado con la FIA, Formula 1, Formula 2, Formula 3, equipos, pilotos, circuitos, fabricantes o sponsors mencionados.
