import { PLASENCIA_START_REGION } from '../config/mapConfig.js';
import { parseOsmToWorld } from './osmParser.js';
import { createProjector } from './projection.js';
import { fetchRegionOsm } from '../services/overpassClient.js';

const LOAD_RADIUS = 1;
const REQUEST_COOLDOWN_MS = 3500;
const CHUNK_LAT_SIZE = PLASENCIA_START_REGION.bbox.north - PLASENCIA_START_REGION.bbox.south;
const CHUNK_LON_SIZE = PLASENCIA_START_REGION.bbox.east - PLASENCIA_START_REGION.bbox.west;

function makeChunkId(col, row) {
  return `${col}:${row}`;
}

function makeChunkRegion(col, row) {
  const west = PLASENCIA_START_REGION.bbox.west + col * CHUNK_LON_SIZE;
  const east = west + CHUNK_LON_SIZE;
  const north = PLASENCIA_START_REGION.bbox.north - row * CHUNK_LAT_SIZE;
  const south = north - CHUNK_LAT_SIZE;

  return {
    id: `${PLASENCIA_START_REGION.id}:chunk:${makeChunkId(col, row)}`,
    name: `${PLASENCIA_START_REGION.name} · chunk ${makeChunkId(col, row)}`,
    center: PLASENCIA_START_REGION.center,
    bbox: { south, west, north, east },
    chunk: { col, row },
  };
}

function getChunkWorldBounds(projector, region) {
  return projector.boundsToWorldBounds(region.bbox);
}

function getCameraChunk(camera, projector) {
  const baseBounds = getChunkWorldBounds(projector, PLASENCIA_START_REGION);
  const col = Math.floor((camera.x - baseBounds.minX) / Math.max(baseBounds.width, 1));
  const row = Math.floor((camera.y - baseBounds.minY) / Math.max(baseBounds.height, 1));

  return { col, row };
}

function emptyWorld(projector) {
  return {
    region: PLASENCIA_START_REGION,
    bounds: getChunkWorldBounds(projector, PLASENCIA_START_REGION),
    features: [],
    chunks: [],
    stats: { roads: 0, buildings: 0, water: 0, nature: 0 },
  };
}

function mergeBounds(current, next) {
  return {
    minX: Math.min(current.minX, next.minX),
    minY: Math.min(current.minY, next.minY),
    maxX: Math.max(current.maxX, next.maxX),
    maxY: Math.max(current.maxY, next.maxY),
    width: Math.max(current.maxX, next.maxX) - Math.min(current.minX, next.minX),
    height: Math.max(current.maxY, next.maxY) - Math.min(current.minY, next.minY),
  };
}

function recalculateStats(features) {
  return {
    roads: features.filter(feature => feature.type === 'road').length,
    buildings: features.filter(feature => feature.type === 'building').length,
    water: features.filter(feature => feature.type === 'water').length,
    nature: features.filter(feature => feature.type === 'nature').length,
  };
}

function mergeWorld(currentWorld, chunkWorld, loadedChunks) {
  const seen = new Set();
  const features = [];

  for (const feature of [...currentWorld.features, ...chunkWorld.features]) {
    const key = `${feature.type}:${feature.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    features.push(feature);
  }

  const chunkBounds = chunkWorld.bounds;
  const bounds = mergeBounds(currentWorld.bounds, chunkBounds);

  return {
    region: PLASENCIA_START_REGION,
    bounds,
    features,
    chunks: [...loadedChunks],
    stats: recalculateStats(features),
  };
}

export function createWorldChunkManager({ onWorldChange, onStatus }) {
  const projector = createProjector(PLASENCIA_START_REGION);
  const loadedChunks = new Set();
  const queuedChunks = new Set();
  const queue = [];
  let world = emptyWorld(projector);
  let loading = false;
  let nextNetworkSlotAt = 0;

  function emitWorld() {
    onWorldChange?.(world);
  }

  function getWorld() {
    return world;
  }

  function enqueueChunk(col, row, { force = false } = {}) {
    const id = makeChunkId(col, row);
    if (!force && (loadedChunks.has(id) || queuedChunks.has(id))) return;

    queuedChunks.add(id);
    queue.push({ col, row, id, force });
    processQueue();
  }

  function enqueueAroundCamera(camera) {
    const center = getCameraChunk(camera, projector);

    for (let row = center.row - LOAD_RADIUS; row <= center.row + LOAD_RADIUS; row += 1) {
      for (let col = center.col - LOAD_RADIUS; col <= center.col + LOAD_RADIUS; col += 1) {
        enqueueChunk(col, row);
      }
    }
  }

  function waitForNetworkSlot() {
    const delay = Math.max(0, nextNetworkSlotAt - Date.now());
    return new Promise(resolve => window.setTimeout(resolve, delay));
  }

  async function processQueue() {
    if (loading) return;
    loading = true;

    while (queue.length > 0) {
      const item = queue.shift();
      const region = makeChunkRegion(item.col, item.row);

      try {
        onStatus?.(`Cargando mapa cercano: chunk ${item.id}...`);
        await waitForNetworkSlot();
        const { payload, source } = await fetchRegionOsm(region, { force: item.force });
        if (source === 'overpass') {
          nextNetworkSlotAt = Date.now() + REQUEST_COOLDOWN_MS;
        }

        const chunkWorld = parseOsmToWorld(payload, region);
        loadedChunks.add(item.id);
        queuedChunks.delete(item.id);
        world = mergeWorld(world, chunkWorld, loadedChunks);
        emitWorld();
        onStatus?.(`Mapa cargado: ${loadedChunks.size} chunks, ${world.features.length} elementos. ${queue.length ? `Cola: ${queue.length}` : 'Sin cola pendiente'}.`);
      } catch (error) {
        queuedChunks.delete(item.id);
        console.error(error);
        onStatus?.(error instanceof Error ? error.message : `No se pudo cargar el chunk ${item.id}.`);
      }
    }

    loading = false;
  }

  function reset({ force = false } = {}) {
    loadedChunks.clear();
    queuedChunks.clear();
    queue.length = 0;
    world = emptyWorld(projector);
    emitWorld();
    enqueueChunk(0, 0, { force });
  }

  return {
    getWorld,
    enqueueAroundCamera,
    enqueueChunk,
    reset,
  };
}
