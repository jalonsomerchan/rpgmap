import '../css/main.css';

import { createCamera } from './game/camera.js';
import { createInputController } from './game/inputController.js';
import { createRenderer } from './game/renderer.js';
import { loadTileSet } from './game/tileSet.js';
import { createWorldChunkManager } from './map/worldChunks.js';

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
let cameraApi = null;
let input = null;
let renderer = null;
let tileSet = null;
let chunkManager = null;
let lastChunkCheckAt = 0;

function setStatus(message) {
  statusElement.textContent = message;
}

function setStats(stats) {
  for (const [key, element] of Object.entries(statElements)) {
    element.textContent = String(stats?.[key] || 0);
  }
}

function setBusy(nextBusy) {
  reloadButton.disabled = nextBusy;
  reloadButton.textContent = nextBusy ? 'Cargando...' : 'Cargar / refrescar zona';
}

function handleWorldChange(nextWorld) {
  const hadWorld = Boolean(world?.features?.length);
  world = nextWorld;
  setStats(world.stats);

  if (!hadWorld && world.features.length > 0) {
    cameraApi.centerOn(world.bounds);
  }
}

function requestNearbyChunks() {
  const now = Date.now();
  if (!chunkManager || !cameraApi || now - lastChunkCheckAt < 900) return;

  lastChunkCheckAt = now;
  chunkManager.enqueueAroundCamera(cameraApi.camera);
}

function frame() {
  input.update();
  requestNearbyChunks();
  renderer.render(world);
  requestAnimationFrame(frame);
}

function boot() {
  renderer.resize();
  input.bind();
  setStatus('Cargando Plasencia por chunks. Al moverte se irán descargando zonas cercanas sin hacer peticiones masivas.');
  chunkManager.reset({ force: false });
  requestAnimationFrame(frame);
}

async function init() {
  cameraApi = createCamera(canvas);
  input = createInputController(canvas, cameraApi);
  tileSet = await loadTileSet();
  renderer = createRenderer(canvas, cameraApi, tileSet);

  chunkManager = createWorldChunkManager({
    onWorldChange: handleWorldChange,
    onStatus: message => {
      setBusy(message.startsWith('Cargando'));
      const tileText = renderer.hasExternalTileSet ? `tileset externo (${tileSet.source})` : 'tileset procedural';
      setStatus(`${message} Render: ${tileText}.`);
    },
  });

  reloadButton.addEventListener('click', () => {
    setBusy(true);
    chunkManager.reset({ force: true });
  });

  resetButton.addEventListener('click', () => {
    if (world) cameraApi.centerOn(world.bounds);
  });

  window.addEventListener('resize', () => {
    renderer.resize();
    if (world) cameraApi.centerOn(world.bounds);
  });

  boot();
}

init().catch(error => {
  console.error(error);
  setStatus('No se pudo iniciar el juego. Revisa la consola para más detalles.');
});
