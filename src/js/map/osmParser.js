import { FEATURE_LIMITS } from '../config/mapConfig.js';
import { createProjector, getPathBounds } from './projection.js';

const ROAD_WEIGHT = {
  motorway: 5,
  trunk: 5,
  primary: 4,
  secondary: 3,
  tertiary: 3,
  residential: 2,
  service: 1,
  unclassified: 1,
};

function classifyWay(tags = {}) {
  if (tags.building) return 'building';
  if (tags.highway) return 'road';
  if (tags.waterway || tags.natural === 'water') return 'water';
  if (tags.landuse || tags.natural || tags.leisure) return 'nature';
  return 'unknown';
}

function isClosed(points) {
  if (points.length < 3) return false;
  const first = points[0];
  const last = points[points.length - 1];
  return first.x === last.x && first.y === last.y;
}

function featureWeight(feature) {
  if (feature.type === 'road') return ROAD_WEIGHT[feature.tags.highway] || 1;
  if (feature.type === 'water') return feature.tags.natural === 'water' ? 3 : 2;
  if (feature.type === 'building') return 1;
  if (feature.type === 'nature') return feature.tags.landuse === 'forest' || feature.tags.natural === 'wood' ? 3 : 2;
  return 0;
}

function limitFeatures(features, type, limit) {
  return features
    .filter(feature => feature.type === type)
    .sort((a, b) => featureWeight(b) - featureWeight(a))
    .slice(0, limit);
}

export function parseOsmToWorld(osmPayload, region) {
  const projector = createProjector(region);
  const nodeById = new Map();
  const elements = osmPayload?.elements || [];

  for (const element of elements) {
    if (element.type === 'node') {
      nodeById.set(element.id, projector.toWorld({ lat: element.lat, lon: element.lon }));
    }
  }

  const rawFeatures = [];

  for (const element of elements) {
    if (element.type !== 'way' || !element.nodes?.length) continue;

    const type = classifyWay(element.tags);
    if (type === 'unknown') continue;

    const points = element.nodes.map(nodeId => nodeById.get(nodeId)).filter(Boolean);
    if (points.length < 2) continue;

    const bounds = getPathBounds(points);
    rawFeatures.push({
      id: element.id,
      type,
      tags: element.tags || {},
      points,
      bounds,
      closed: isClosed(points),
      weight: featureWeight({ type, tags: element.tags || {} }),
    });
  }

  const features = [
    ...limitFeatures(rawFeatures, 'nature', FEATURE_LIMITS.maxNature),
    ...limitFeatures(rawFeatures, 'water', FEATURE_LIMITS.maxWater),
    ...limitFeatures(rawFeatures, 'road', FEATURE_LIMITS.maxRoads),
    ...limitFeatures(rawFeatures, 'building', FEATURE_LIMITS.maxBuildings),
  ];

  return {
    region,
    bounds: projector.boundsToWorldBounds(region.bbox),
    features,
    stats: {
      roads: features.filter(feature => feature.type === 'road').length,
      buildings: features.filter(feature => feature.type === 'building').length,
      water: features.filter(feature => feature.type === 'water').length,
      nature: features.filter(feature => feature.type === 'nature').length,
    },
  };
}
