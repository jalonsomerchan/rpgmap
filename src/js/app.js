import '../css/main.css';

import { PLASENCIA_START_REGION } from './config/mapConfig.js';
import { createCamera } from './game/camera.js';
import { createInputController } from './game/inputController.js';
import { createRenderer } from './game/renderer.js';
import { loadTileSet } from './game/tileSet.js';
import { parseOsmToWorld } from './map/osmParser.js';
import { fetchRegionOsm } from './services/overpassClient.js';

const canvas = document.querySelector('#game-canvas');
const statusElement = document.querySelector('#map-status');
const reloadButton = document.querySelector('#reload-map');
const resetButton = document.querySelector('#reset-camera');

const statElements = {
  roads: document.querySelector('#stat-roads'),
  buildings: document.querySelector('#stat-buildings'),
  water: document.querySelector('#stat-water'),
  nature: document.querySelector('#stat-nature'),
};

let world = null;
let isLoading = false;

const cameraApi = createCamera(canvas);
const input = createInputController(canvas, cameraApi);
const tileSet = await loadTileSet();
const renderer = createRenderer(canvas, cameraApi, tileSet);

function setStatus(message) {
  statusElement.textContent = message;
}

function setStats(stats) {
  for (const [key, element] of Object.entries(statElements)) {
    element.textContent = String(stats?.[key] || 0);
  }
}

function setBusy(nextBusy) {
  isLoading = nextBusy;
  reloadButton.disabled = nextBusy;
  reloadButton.textContent = nextBusy ? 'Cargando...' : 'Cargar / refrescar Plasencia';
}

function formatSavedAt(timestamp) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

async function loadWorld({ force = false } = {}) {
  if (isLoading) return;

  try {
    setBusy(true);
    setStatus(force ? 'Consultando Overpass con control de frecuencia...' : 'Buscando datos en caché local...');

    const { payload, source, savedAt } = await fetchRegionOsm(PLASENCIA_START_REGION, { force });
    world = parseOsmToWorld(payload, PLASENCIA_START_REGION);
    cameraApi.centerOn(world.bounds);
    setStats(world.stats);

    const sourceText = source === 'cache' ? 'caché local' : 'Overpass';
    const tileText = renderer.hasExternalTileSet ? `tileset externo (${tileSet.source})` : 'tileset procedural';
    setStatus(`${world.region.name}: ${world.features.length} elementos desde ${sourceText}. Guardado: ${formatSavedAt(savedAt)}. Render: ${tileText}.`);
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : 'No se pudo cargar el mapa.');
  } finally {
    setBusy(false);
  }
}

function frame() {
  input.update();
  renderer.render(world);
  requestAnimationFrame(frame);
}

function boot() {
  renderer.resize();
  input.bind();
  setStatus('Pulsa “Cargar / refrescar Plasencia” para pedir los datos iniciales. Si ya existe caché, se usará automáticamente.');
  loadWorld({ force: false });
  requestAnimationFrame(frame);
}

reloadButton.addEventListener('click', () => loadWorld({ force: true }));
resetButton.addEventListener('click', () => {
  if (world) cameraApi.centerOn(world.bounds);
});

window.addEventListener('resize', () => {
  renderer.resize();
  if (world) cameraApi.centerOn(world.bounds);
});

boot();
