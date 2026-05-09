export const PLASENCIA_START_REGION = Object.freeze({
  id: 'plasencia-es',
  name: 'Plasencia, España',
  center: { lat: 40.0312, lon: -6.0885 },
  // Zona inicial más pequeña: carga menos datos de Overpass y arranca con más detalle.
  bbox: {
    south: 40.0272,
    west: -6.0952,
    north: 40.0352,
    east: -6.0818,
  },
});

export const OVERPASS_CONFIG = Object.freeze({
  endpoint: 'https://overpass-api.de/api/interpreter',
  cacheVersion: 3,
  cacheTtlMs: 1000 * 60 * 60 * 24 * 7,
  minManualRefreshMs: 1000 * 60 * 5,
  timeoutSeconds: 25,
});

export const TILE_SIZE = 32;
export const WORLD_SCALE = 105000;

export const FEATURE_LIMITS = Object.freeze({
  maxBuildings: 320,
  maxRoads: 260,
  maxWater: 100,
  maxNature: 110,
});
