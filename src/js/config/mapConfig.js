export const PLASENCIA_START_REGION = Object.freeze({
  id: 'plasencia-es',
  name: 'Plasencia, España',
  center: { lat: 40.0312, lon: -6.0885 },
  bbox: {
    south: 40.0185,
    west: -6.1055,
    north: 40.0445,
    east: -6.0695,
  },
});

export const OVERPASS_CONFIG = Object.freeze({
  endpoint: 'https://overpass-api.de/api/interpreter',
  cacheVersion: 1,
  cacheTtlMs: 1000 * 60 * 60 * 24 * 7,
  minManualRefreshMs: 1000 * 60 * 5,
  timeoutSeconds: 25,
});

export const TILE_SIZE = 32;
export const WORLD_SCALE = 105000;

export const FEATURE_LIMITS = Object.freeze({
  maxBuildings: 900,
  maxRoads: 350,
  maxWater: 120,
  maxNature: 180,
});
