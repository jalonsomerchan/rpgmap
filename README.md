# RPGMap

Prototipo inicial de juego RPG que transforma un trozo real del mapa en una escena jugable sobre canvas.

La primera zona implementada es **Plasencia, España**. El cliente consulta Overpass API solo bajo demanda, guarda los datos en `localStorage` y renderiza los elementos principales con estética RPG.

## Inicio rápido

```bash
npm install
npm run dev
```

## Build de producción

```bash
npm run build
npm run preview
```

## Despliegue en GitHub Pages

Este proyecto usa Vite, por lo que **no debe publicarse directamente desde la raíz del repositorio**. Primero hay que compilarlo y publicar la carpeta `dist`.

Ya queda incluido el workflow `.github/workflows/deploy-pages.yml`, que hace esto automáticamente cuando se fusiona a `main`:

1. Instala dependencias con `npm ci`.
2. Ejecuta `npm run build`.
3. Sube `dist` a GitHub Pages.

En GitHub, ve a:

```text
Settings → Pages → Build and deployment → Source → GitHub Actions
```

La URL final será parecida a:

```text
https://jalonsomerchan.github.io/rpgmap/
```

El `vite.config.js` incluye `base: '/rpgmap/'`, necesario para que los assets funcionen correctamente bajo GitHub Pages.

## Controles

- `WASD` o flechas: mover cámara.
- Arrastrar con el ratón: desplazar el mapa.
- Rueda del ratón: zoom.
- Botón “Centrar cámara”: vuelve al encuadre inicial.

## Datos solicitados a Overpass

Para no abusar de Overpass, se consulta un bounding box pequeño alrededor de Plasencia y solo se piden elementos esenciales:

- Carreteras: `highway`, excluyendo caminos menores como `footway`, `path` y `steps`.
- Edificios: `building`.
- Ríos/canales/arroyos: `waterway`.
- Agua: `natural=water`.
- Naturaleza: `landuse=forest|grass|meadow|recreation_ground`, `natural=wood|scrub|grassland`, `leisure=park|garden`.

La respuesta se cachea durante 7 días. El refresco manual tiene una protección de 5 minutos.

## Estructura principal

```text
src/js/
  app.js                         # Arranque y coordinación de la escena
  config/mapConfig.js            # Región inicial, límites y configuración Overpass
  services/overpassClient.js     # Query, fetch, caché y protección de frecuencia
  map/projection.js              # Conversión lat/lon a coordenadas del mundo
  map/osmParser.js               # Clasificación de elementos OSM
  game/camera.js                 # Cámara, zoom y conversión pantalla/mundo
  game/inputController.js        # Teclado, ratón y rueda
  game/renderer.js               # Render canvas por capas
  game/tileSet.js                # Carga de tileset real o fallback procedural
```

## Tileset

El renderer busca automáticamente un tileset en estas rutas:

- `/src/assets/tileset.png`
- `/src/assets/tileset.webp`
- `/src/assets/rpg-tileset.png`
- `/assets/tileset.png`

Si no encuentra ninguno, usa patrones procedurales para que el prototipo funcione igualmente.

## Próximos pasos recomendados

1. Convertir el marcador central en jugador real con colisiones básicas.
2. Trocear el mundo en chunks para cargar zonas vecinas sin pedir todo el mapa.
3. Añadir una cola de peticiones y persistencia IndexedDB para regiones descargadas.
4. Mapear tipos OSM a tiles concretos del tileset cuando esté fijada la hoja definitiva.
5. Añadir entidades NPC, puntos de interés y capas de interacción.

## Licencia

MIT
