export function createCamera(canvas) {
  const camera = {
    x: 0,
    y: 0,
    zoom: 2.15,
    minZoom: 1.1,
    maxZoom: 5.5,
    speed: 11,
  };

  function clampZoom(value) {
    return Math.min(camera.maxZoom, Math.max(camera.minZoom, value));
  }

  function screenToWorld(screenX, screenY) {
    return {
      x: (screenX - canvas.width / 2) / camera.zoom + camera.x,
      y: (screenY - canvas.height / 2) / camera.zoom + camera.y,
    };
  }

  function worldToScreen(point) {
    return {
      x: (point.x - camera.x) * camera.zoom + canvas.width / 2,
      y: (point.y - camera.y) * camera.zoom + canvas.height / 2,
    };
  }

  function zoomAt(screenX, screenY, delta) {
    const before = screenToWorld(screenX, screenY);
    camera.zoom = clampZoom(camera.zoom * delta);
    const after = screenToWorld(screenX, screenY);

    camera.x += before.x - after.x;
    camera.y += before.y - after.y;
  }

  function centerOn(bounds) {
    camera.x = bounds.minX + bounds.width / 2;
    camera.y = bounds.minY + bounds.height / 2;
    const zoomX = canvas.width / Math.max(bounds.width, 1);
    const zoomY = canvas.height / Math.max(bounds.height, 1);
    camera.zoom = clampZoom(Math.min(zoomX, zoomY) * 1.75);
  }

  return { camera, screenToWorld, worldToScreen, zoomAt, centerOn };
}
