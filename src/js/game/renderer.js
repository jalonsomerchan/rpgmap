import { TILE_SIZE } from '../config/mapConfig.js';
import { createProceduralPatterns } from './tileSet.js';

const ISO = Object.freeze({
  tileW: 32,
  tileH: 16,
  sprite: 16,
  objectSprite: 32,
});

const ATLAS = Object.freeze({
  grass: { x: 0, y: 0, w: 16, h: 16 },
  grassAlt: { x: 16, y: 0, w: 16, h: 16 },
  sand: { x: 48, y: 48, w: 16, h: 16 },
  road: { x: 48, y: 0, w: 16, h: 16 },
  roadAlt: { x: 64, y: 0, w: 16, h: 16 },
  forest: { x: 0, y: 144, w: 16, h: 16 },
  forestAlt: { x: 16, y: 144, w: 16, h: 16 },
  water: { x: 0, y: 160, w: 16, h: 16 },
  waterAlt: { x: 16, y: 160, w: 16, h: 16 },
  building: { x: 112, y: 448, w: 16, h: 16 },
  buildingAlt: { x: 128, y: 448, w: 16, h: 16 },
  roof: { x: 112, y: 432, w: 16, h: 16 },
  tree: { x: 0, y: 448, w: 16, h: 16 },
  player: { x: 0, y: 544, w: 16, h: 16 },
});

const FEATURE_PRIORITY = Object.freeze({
  nature: 1,
  water: 2,
  building: 3,
});

const ROAD_STYLE = Object.freeze({
  motorway: { width: 12, fill: '#d8bf7f', edge: '#5b4a31' },
  trunk: { width: 11, fill: '#d8bf7f', edge: '#5b4a31' },
  primary: { width: 10, fill: '#d8bf7f', edge: '#5b4a31' },
  secondary: { width: 8, fill: '#cdb172', edge: '#584830' },
  tertiary: { width: 7, fill: '#c3a66a', edge: '#51442e' },
  residential: { width: 6, fill: '#b89d6a', edge: '#4f4433' },
  living_street: { width: 5, fill: '#b89d6a', edge: '#4f4433' },
  service: { width: 4, fill: '#a69065', edge: '#4a4032' },
  pedestrian: { width: 4, fill: '#d6c28f', edge: '#5b503b' },
  footway: { width: 3, fill: '#d6c28f', edge: '#5b503b' },
  path: { width: 3, fill: '#d6c28f', edge: '#5b503b' },
  track: { width: 3, fill: '#927b4d', edge: '#473b27' },
  default: { width: 5, fill: '#b89d6a', edge: '#4f4433' },
});

export function createRenderer(canvas, cameraApi, tileSet) {
  const ctx = canvas.getContext('2d');
  const patterns = createProceduralPatterns(ctx);
  const atlasReady = Boolean(tileSet?.ready && tileSet.image);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width));
    canvas.height = Math.max(1, Math.floor(rect.height));
  }

  function clear() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#08130d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function applyCamera() {
    ctx.setTransform(cameraApi.camera.zoom, 0, 0, cameraApi.camera.zoom, canvas.width / 2, canvas.height / 2);
    ctx.translate(-cameraApi.camera.x, -cameraApi.camera.y);
  }

  function worldToIso(point) {
    return {
      x: point.x - point.y,
      y: (point.x + point.y) * 0.5,
    };
  }

  function tileToIso(col, row) {
    return {
      x: (col - row) * ISO.tileW * 0.5,
      y: (col + row) * ISO.tileH * 0.5,
    };
  }

  function drawIsoDiamond(cx, cy, fill, stroke = 'rgba(0,0,0,0.16)') {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + ISO.tileW / 2, cy + ISO.tileH / 2);
    ctx.lineTo(cx, cy + ISO.tileH);
    ctx.lineTo(cx - ISO.tileW / 2, cy + ISO.tileH / 2);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1 / cameraApi.camera.zoom;
    ctx.stroke();
  }

  function drawSprite(sprite, x, y, width = ISO.tileW, height = ISO.tileW) {
    if (!atlasReady || !sprite) return false;

    ctx.drawImage(tileSet.image, sprite.x, sprite.y, sprite.w, sprite.h, x, y, width, height);
    return true;
  }

  function drawObjectSprite(sprite, cx, cy, heightTiles = 1) {
    const height = ISO.objectSprite * heightTiles;
    if (drawSprite(sprite, cx - ISO.objectSprite / 2, cy + ISO.tileH / 2 - height, ISO.objectSprite, height)) return;
    drawIsoDiamond(cx, cy, '#8b6d50');
  }

  function isPointInBounds(point, bounds) {
    return point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY;
  }

  function pointInPolygon(point, polygon) {
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const pi = polygon[i];
      const pj = polygon[j];
      const intersects = pi.y > point.y !== pj.y > point.y && point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y || 1) + pi.x;
      if (intersects) inside = !inside;
    }

    return inside;
  }

  function featureCoversAreaCell(feature, point) {
    if (!isPointInBounds(point, feature.bounds)) return false;
    if (!feature.closed || feature.points.length <= 3) return false;
    return pointInPolygon(point, feature.points);
  }

  function classifyCell(features, point) {
    let result = { type: 'grass', feature: null, priority: 0 };

    for (const feature of features) {
      if (feature.type === 'road') continue;
      if (feature.type === 'water' && !feature.closed) continue;
      if (!featureCoversAreaCell(feature, point)) continue;

      const priority = FEATURE_PRIORITY[feature.type] || 0;
      if (priority >= result.priority) {
        result = { type: feature.type, feature, priority };
      }
    }

    return result;
  }

  function getTileSprite(cell, col, row) {
    if (cell.type === 'water') return (col + row) % 2 === 0 ? ATLAS.water : ATLAS.waterAlt;
    if (cell.type === 'nature') {
      const isForest = cell.feature?.tags?.landuse === 'forest' || cell.feature?.tags?.natural === 'wood';
      return isForest ? ATLAS.forest : ATLAS.grassAlt;
    }
    if (cell.type === 'building') return ATLAS.sand;
    return (col + row) % 5 === 0 ? ATLAS.grassAlt : ATLAS.grass;
  }

  function drawGroundTile(cell, cx, cy, col, row) {
    const sprite = getTileSprite(cell, col, row);

    if (!atlasReady || !drawSprite(sprite, cx - ISO.tileW / 2, cy - ISO.tileH / 2, ISO.tileW, ISO.tileW)) {
      const fillByType = {
        grass: patterns.grass || '#234525',
        nature: patterns.forest || '#245c2e',
        water: patterns.water || '#287d9f',
        building: patterns.building || '#a68462',
      };
      drawIsoDiamond(cx, cy, fillByType[cell.type] || fillByType.grass);
    }
  }

  function drawBuilding(cx, cy, col, row) {
    const floors = (Math.abs(col * 17 + row * 31) % 2) + 1;
    for (let level = 0; level < floors; level += 1) {
      const sprite = (col + row + level) % 2 === 0 ? ATLAS.building : ATLAS.buildingAlt;
      drawObjectSprite(sprite, cx, cy - level * 13, 1);
    }
    drawObjectSprite(ATLAS.roof, cx, cy - floors * 13, 1);
  }

  function drawTree(cx, cy, col, row) {
    if ((Math.abs(col * 11 + row * 7) % 4) !== 0) return;
    const sprite = (col + row) % 2 === 0 ? ATLAS.tree : ATLAS.forestAlt;
    drawObjectSprite(sprite, cx, cy, 1);
  }

  function buildCells(world) {
    const bounds = world.bounds;
    const minCol = Math.floor(bounds.minX / TILE_SIZE) - 2;
    const maxCol = Math.ceil(bounds.maxX / TILE_SIZE) + 2;
    const minRow = Math.floor(bounds.minY / TILE_SIZE) - 2;
    const maxRow = Math.ceil(bounds.maxY / TILE_SIZE) + 2;
    const cells = [];

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        const point = {
          x: col * TILE_SIZE + TILE_SIZE / 2,
          y: row * TILE_SIZE + TILE_SIZE / 2,
        };
        const iso = tileToIso(col, row);
        const cell = classifyCell(world.features, point);
        cells.push({ col, row, point, iso, cell, depth: iso.y });
      }
    }

    return cells.sort((a, b) => a.depth - b.depth);
  }

  function drawIsoGrid(world) {
    const cells = buildCells(world);

    for (const tile of cells) {
      drawGroundTile(tile.cell, tile.iso.x, tile.iso.y, tile.col, tile.row);
      if (tile.cell.type === 'nature') drawTree(tile.iso.x, tile.iso.y, tile.col, tile.row);
      if (tile.cell.type === 'building') drawBuilding(tile.iso.x, tile.iso.y, tile.col, tile.row);
    }
  }

  function drawIsoFeaturePath(feature, { width, fill, edge, alpha = 1 }) {
    if (feature.points.length < 2) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    feature.points.forEach((point, index) => {
      const iso = worldToIso(point);
      if (index === 0) ctx.moveTo(iso.x, iso.y + ISO.tileH * 0.45);
      else ctx.lineTo(iso.x, iso.y + ISO.tileH * 0.45);
    });
    ctx.strokeStyle = edge;
    ctx.lineWidth = (width + 4) / cameraApi.camera.zoom;
    ctx.stroke();

    ctx.beginPath();
    feature.points.forEach((point, index) => {
      const iso = worldToIso(point);
      if (index === 0) ctx.moveTo(iso.x, iso.y + ISO.tileH * 0.45);
      else ctx.lineTo(iso.x, iso.y + ISO.tileH * 0.45);
    });
    ctx.strokeStyle = fill;
    ctx.lineWidth = width / cameraApi.camera.zoom;
    ctx.stroke();

    ctx.restore();
  }

  function drawRoadsAndRivers(features) {
    const linearWater = features.filter(feature => feature.type === 'water' && !feature.closed);
    const roads = features.filter(feature => feature.type === 'road');

    for (const feature of linearWater) {
      const isRiver = feature.tags.waterway === 'river' || feature.tags.waterway === 'canal';
      drawIsoFeaturePath(feature, {
        width: isRiver ? 12 : 7,
        fill: isRiver ? '#33bfe0' : '#4cc9e8',
        edge: '#145d75',
        alpha: 0.96,
      });
    }

    for (const feature of roads) {
      const style = ROAD_STYLE[feature.tags.highway] || ROAD_STYLE.default;
      drawIsoFeaturePath(feature, { ...style, alpha: 0.98 });
    }
  }

  function drawPlayer() {
    const iso = worldToIso({ x: 0, y: 0 });
    if (atlasReady) {
      drawSprite(ATLAS.player, iso.x - 12, iso.y - 26, 24, 24);
      return;
    }

    ctx.save();
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#2b1d08';
    ctx.lineWidth = 1.5 / cameraApi.camera.zoom;
    ctx.beginPath();
    ctx.arc(iso.x, iso.y, 8 / cameraApi.camera.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function render(world) {
    clear();
    if (!world) return;

    ctx.save();
    applyCamera();
    ctx.imageSmoothingEnabled = false;
    drawIsoGrid(world);
    drawRoadsAndRivers(world.features);
    drawPlayer();
    ctx.restore();
  }

  return { resize, render, hasExternalTileSet: atlasReady };
}
