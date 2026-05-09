export async function loadTileSet() {
  const candidates = [
    '/src/assets/tileset.png',
    '/src/assets/tileset.webp',
    '/src/assets/rpg-tileset.png',
    '/assets/tileset.png',
  ];

  for (const src of candidates) {
    const image = await tryLoadImage(src);
    if (image) {
      return { image, source: src, ready: true };
    }
  }

  return { image: null, source: 'procedural', ready: false };
}

function tryLoadImage(src) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

export function createProceduralPatterns(ctx) {
  return {
    grass: createPattern(ctx, '#234525', '#2f5b2f', '#1b331d'),
    forest: createPattern(ctx, '#17391f', '#22552d', '#102614'),
    park: createPattern(ctx, '#2f6135', '#407a44', '#244b29'),
    water: createPattern(ctx, '#1f5f7a', '#287d9f', '#17475d'),
    road: createPattern(ctx, '#6a6254', '#817766', '#524c42'),
    building: createPattern(ctx, '#8b6d50', '#a68462', '#654b36'),
  };
}

function createPattern(ctx, base, light, dark) {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const patternCtx = canvas.getContext('2d');

  patternCtx.fillStyle = base;
  patternCtx.fillRect(0, 0, 32, 32);
  patternCtx.fillStyle = light;
  patternCtx.fillRect(0, 0, 15, 15);
  patternCtx.fillRect(16, 16, 16, 16);
  patternCtx.strokeStyle = dark;
  patternCtx.globalAlpha = 0.45;
  patternCtx.strokeRect(0.5, 0.5, 31, 31);
  patternCtx.beginPath();
  patternCtx.moveTo(16, 0);
  patternCtx.lineTo(16, 32);
  patternCtx.moveTo(0, 16);
  patternCtx.lineTo(32, 16);
  patternCtx.stroke();

  return ctx.createPattern(canvas, 'repeat');
}
