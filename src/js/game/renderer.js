import { TILE_SIZE } from '../config/mapConfig.js';
import { createProceduralPatterns } from './tileSet.js';

const STYLE = {
  road: { stroke: '#c8b68d', casing: '#463f36' },
  water: { stroke: '#4fb7d7', fill: '#2b7f9f' },
  building: { stroke: '#3a2a1e', fill: '#a97d55' },
  forest: { stroke: '#16381d', fill: '#245c2e' },
  park: { stroke: '#22542a', fill: '#43824b' },
};

export function createRenderer(canvas, cameraApi, tileSet) {
  const ctx = canvas.getContext('2d');
  const patterns = createProceduralPatterns(ctx);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clear() {
    const width = canvas.width;
    const height = canvas.height;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#101b16';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function applyCamera() {
    ctx.setTransform(cameraApi.camera.zoom, 0, 0, cameraApi.camera.zoom, canvas.width / 2, canvas.height / 2);
    ctx.translate(-cameraApi.camera.x, -cameraApi.camera.y);
  }

  function drawGround(bounds) {
    ctx.save();
    ctx.fillStyle = patterns.grass || '#254529';
    ctx.fillRect(bounds.minX - 200, bounds.minY - 200, bounds.width + 400, bounds.height + 400);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1 / cameraApi.camera.zoom;
    for (let x = Math.floor(bounds.minX / TILE_SIZE) * TILE_SIZE; x < bounds.maxX; x += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, bounds.minY - 200);
      ctx.lineTo(x, bounds.maxY + 200);
      ctx.stroke();
    }
    for (let y = Math.floor(bounds.minY / TILE_SIZE) * TILE_SIZE; y < bounds.maxY; y += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(bounds.minX - 200, y);
      ctx.lineTo(bounds.maxX + 200, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function path(feature) {
    ctx.beginPath();
    feature.points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
  }

  function drawPolygon(feature, fill, stroke) {
    if (!feature.closed) return;
    path(feature);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.25 / cameraApi.camera.zoom;
    ctx.fill();
    ctx.stroke();
  }

  function drawLine(feature, stroke, width) {
    path(feature);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width / cameraApi.camera.zoom;
    ctx.stroke();
  }

  function drawNature(features) {
    for (const feature of features) {
      const isForest = feature.tags.landuse === 'forest' || feature.tags.natural === 'wood';
      const fill = isForest ? patterns.forest || STYLE.forest.fill : patterns.park || STYLE.park.fill;
      const stroke = isForest ? STYLE.forest.stroke : STYLE.park.stroke;
      drawPolygon(feature, fill, stroke);
    }
  }

  function drawWater(features) {
    for (const feature of features) {
      if (feature.closed) {
        drawPolygon(feature, patterns.water || STYLE.water.fill, STYLE.water.stroke);
      } else {
        drawLine(feature, STYLE.water.stroke, 8);
      }
    }
  }

  function drawRoads(features) {
    for (const feature of features) {
      const width = feature.weight >= 4 ? 9 : feature.weight >= 3 ? 7 : feature.weight >= 2 ? 5 : 3;
      drawLine(feature, STYLE.road.casing, width + 3);
      drawLine(feature, STYLE.road.stroke, width);
    }
  }

  function drawBuildings(features) {
    for (const feature of features) {
      drawPolygon(feature, patterns.building || STYLE.building.fill, STYLE.building.stroke);
    }
  }

  function drawPlayer() {
    ctx.save();
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#2b1d08';
    ctx.lineWidth = 1.5 / cameraApi.camera.zoom;
    ctx.beginPath();
    ctx.arc(0, 0, 8 / cameraApi.camera.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function render(world) {
    clear();
    if (!world) return;

    ctx.save();
    applyCamera();
    drawGround(world.bounds);

    drawNature(world.features.filter(feature => feature.type === 'nature'));
    drawWater(world.features.filter(feature => feature.type === 'water'));
    drawRoads(world.features.filter(feature => feature.type === 'road'));
    drawBuildings(world.features.filter(feature => feature.type === 'building'));
    drawPlayer();
    ctx.restore();
  }

  return { resize, render, hasExternalTileSet: Boolean(tileSet?.ready) };
}
