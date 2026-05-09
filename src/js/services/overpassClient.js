import { OVERPASS_CONFIG } from '../config/mapConfig.js';

const buildCacheKey = region => `rpgmap:osm:${OVERPASS_CONFIG.cacheVersion}:${region.id}`;
const buildRefreshKey = region => `rpgmap:osm:last-refresh:${region.id}`;

export function buildOverpassQuery(region) {
  const { south, west, north, east } = region.bbox;
  const bbox = `${south},${west},${north},${east}`;

  return `
[out:json][timeout:${OVERPASS_CONFIG.timeoutSeconds}];
(
  way["highway"~"motorway|trunk|primary|secondary|tertiary|residential|service|unclassified|living_street|pedestrian|footway|path|track"](${bbox});
  way["building"](${bbox});
  way["waterway"~"river|stream|canal|ditch|drain"](${bbox});
  way["natural"="water"](${bbox});
  relation["natural"="water"](${bbox});
  way["landuse"~"forest|grass|meadow|recreation_ground|farmland|orchard"](${bbox});
  way["natural"~"wood|scrub|grassland|tree_row"](${bbox});
  way["leisure"~"park|garden"](${bbox});
);
out body;
>;
out skel qt;`;
}

function readCache(region) {
  try {
    const cached = JSON.parse(localStorage.getItem(buildCacheKey(region)) || 'null');

    if (!cached || !cached.savedAt || !cached.payload) {
      return null;
    }

    if (Date.now() - cached.savedAt > OVERPASS_CONFIG.cacheTtlMs) {
      return null;
    }

    return cached;
  } catch {
    return null;
  }
}

function writeCache(region, payload) {
  const entry = { savedAt: Date.now(), payload };
  localStorage.setItem(buildCacheKey(region), JSON.stringify(entry));
  localStorage.setItem(buildRefreshKey(region), String(Date.now()));
  return entry;
}

function assertRefreshAllowed(region, force) {
  if (!force) {
    return;
  }

  const lastRefresh = Number(localStorage.getItem(buildRefreshKey(region)) || 0);
  const elapsed = Date.now() - lastRefresh;

  if (elapsed > 0 && elapsed < OVERPASS_CONFIG.minManualRefreshMs) {
    const seconds = Math.ceil((OVERPASS_CONFIG.minManualRefreshMs - elapsed) / 1000);
    throw new Error(`Para cuidar Overpass, espera ${seconds}s antes de refrescar de nuevo.`);
  }
}

export async function fetchRegionOsm(region, { force = false } = {}) {
  const cached = readCache(region);

  if (cached && !force) {
    return { payload: cached.payload, source: 'cache', savedAt: cached.savedAt };
  }

  assertRefreshAllowed(region, force);

  const response = await fetch(OVERPASS_CONFIG.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ data: buildOverpassQuery(region) }),
  });

  if (!response.ok) {
    throw new Error(`Overpass respondió con estado ${response.status}.`);
  }

  const payload = await response.json();
  const entry = writeCache(region, payload);

  return { payload, source: 'overpass', savedAt: entry.savedAt };
}
