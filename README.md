# Racing Universe Manager

Juego web de gestión de automovilismo inspirado en simuladores de management deportivo. Permite dirigir un equipo, gestionar pilotos, finanzas, sponsors, ingeniería, mercado, Race Weekend e historial dentro de un universo multicategoría.

## Estado del proyecto

Alpha v0.7.4 — Corrección de inicio en GitHub Pages, rutas y UTF-8.

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
- Resultados y clasificaciones completas con soporte para grillas variables de 20, 22 o más pilotos.
- PWA básica con manifest, favicon e iconos.
- Guardado/carga local mediante LocalStorage.

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

## Solución de problemas en GitHub Pages

1. Esperar que `Actions → pages build and deployment` quede verde.
2. Verificar que `appMeta.js` tenga la versión correcta.
3. Abrir el juego en incógnito.
4. Si falla, tocar `Ver detalles técnicos`.
5. Comprobar si existe un recurso 404 o si algún JSON devolvió HTML.

Errores típicos:

- `404`: falta subir un archivo o hay diferencia de mayúsculas/minúsculas.
- `Unexpected token '<'`: una ruta de JSON/JS devolvió una página HTML en lugar del archivo esperado.
- `Failed to fetch`: el navegador no pudo solicitar el recurso.

En GitHub Pages no hace falta Python, PowerShell ni launcher local.

## Guardado de partidas

Las partidas se guardan localmente en el dispositivo y navegador actual mediante LocalStorage.

No se sincronizan automáticamente entre celulares o computadoras. Una partida creada en `http://localhost:8000` no aparece automáticamente en `https://usuario.github.io/racing-universe-manager/` porque son orígenes distintos.

## Aviso legal/no oficial

Racing Universe Manager es un proyecto independiente y no oficial. No está afiliado, respaldado ni asociado con la FIA, Formula 1, Formula 2, Formula 3, equipos, pilotos, circuitos, fabricantes o sponsors mencionados.
