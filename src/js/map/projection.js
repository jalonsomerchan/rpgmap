import { WORLD_SCALE } from '../config/mapConfig.js';

export function createProjector(region) {
  const origin = region.center;
  const latFactor = WORLD_SCALE;
  const lonFactor = WORLD_SCALE * Math.cos((origin.lat * Math.PI) / 180);

  function toWorld({ lat, lon }) {
    return {
      x: (lon - origin.lon) * lonFactor,
      y: -(lat - origin.lat) * latFactor,
    };
  }

  function boundsToWorldBounds(bounds) {
    const northWest = toWorld({ lat: bounds.north, lon: bounds.west });
    const southEast = toWorld({ lat: bounds.south, lon: bounds.east });

    return {
      minX: northWest.x,
      minY: northWest.y,
      maxX: southEast.x,
      maxY: southEast.y,
      width: southEast.x - northWest.x,
      height: southEast.y - northWest.y,
    };
  }

  return { toWorld, boundsToWorldBounds };
}

export function getPathBounds(points) {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}
