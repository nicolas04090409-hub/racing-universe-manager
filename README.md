# Racing Universe Manager

Juego web de gestión de automovilismo inspirado en simuladores de management deportivo. Permite dirigir un equipo, gestionar pilotos, finanzas, sponsors, ingeniería, mercado, Race Weekend e historial dentro de un universo multicategoría.

## Estado del proyecto

Alpha v0.7.0 — Release Ready y GitHub Pages.

La versión visible del juego se centraliza en `appMeta.js`. El formato interno de guardado puede tener una versión distinta.

## Funcionalidades actuales

- Universo multicategoría con equipos, pilotos y calendarios.
- Paddock Hub, navegación desktop y mobile-first.
- Race Weekend con prácticas, setup, clasificación y carrera.
- Carrera rápida, simulación global y cierre de temporada.
- Mercado, contratos, staff, sponsors, finanzas e ingeniería.
- Comparativa de desarrollo, historial y noticias.
- PWA básica con manifest, favicon e iconos.
- Guardado/carga local mediante LocalStorage.

## Cómo jugar localmente

Opción simple:

1. Abrí la carpeta `racing-universe-manager`.
2. Hacé doble click en `Iniciar Racing Universe Manager.bat`.
3. El launcher abre `http://localhost:8000` o `http://localhost:8010`.

Opción manual:

```bash
python -m http.server 8000
```

Después abrí:

```text
http://localhost:8000
```

No abras `index.html` directo con doble click: el juego usa módulos JavaScript y necesita servidor HTTP local.

## Cómo probar desde celular

1. Ejecutá el launcher o servidor local en la PC.
2. Buscá la IP local con `ipconfig`.
3. Conectá el celular al mismo Wi‑Fi.
4. Abrí en el navegador del celular:

```text
http://IP-DE-LA-PC:8000
```

Ejemplo:

```text
http://192.168.1.20:8000
```

## Cómo publicar en GitHub Pages

1. Crear un repositorio en GitHub.
2. Subir todos los archivos de `racing-universe-manager/` respetando la estructura.
3. Ir a `Settings`.
4. Entrar en `Pages`.
5. Seleccionar `Deploy from a branch`.
6. Elegir branch `main` y folder `/root`.
7. Guardar.
8. Abrir la URL generada por GitHub Pages.

El proyecto no requiere Node.js, npm, backend ni compilación. Funciona como HTML + CSS + JavaScript + JSON estáticos.

## Cómo actualizar una publicación

1. Reemplazar los archivos modificados.
2. Subir un nuevo commit.
3. GitHub Pages actualizará el mismo enlace.
4. Si ves una mezcla de versiones, recargá sin caché (`Ctrl + F5`) o esperá unos minutos.

## Estructura del proyecto

```text
racing-universe-manager/
├── index.html
├── main.js
├── appMeta.js
├── styles.css
├── manifest.webmanifest
├── README.md
├── CHANGELOG.md
├── NOTICE.md
├── LICENSE
├── .gitignore
├── Iniciar Racing Universe Manager.bat
├── assets/
│   └── icons/
├── data/
├── engine/
├── ui/
└── save/
```

## Guardado de partidas

Las partidas se guardan localmente en el dispositivo y navegador actual mediante LocalStorage.

No se sincronizan automáticamente entre celulares o computadoras. Una partida creada en `http://localhost:8000` no aparece automáticamente en `https://usuario.github.io/racing-universe-manager/` porque son orígenes distintos de almacenamiento.

## Compatibilidad

Probado como sitio estático con rutas relativas para funcionar en subcarpetas, por ejemplo:

```text
https://usuario.github.io/racing-universe-manager/
```

## Roadmap resumido

- Refinar balance de IA y mercado.
- Mejorar profundidad de Race Weekend.
- Pulir UX mobile con pruebas reales en celulares.
- Preparar exportación/importación de partidas en una fase futura.

## Aviso legal/no oficial

Racing Universe Manager es un proyecto independiente y no oficial. No está afiliado, respaldado ni asociado con la FIA, Formula 1, Formula 2, Formula 3, equipos, pilotos, circuitos, fabricantes o sponsors mencionados.

Los valores y atributos son estimaciones creadas exclusivamente con fines de simulación y entretenimiento.

## Licencia

Por ahora: All rights reserved. No se definió una licencia open source.
