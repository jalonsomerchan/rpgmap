const MOVEMENT_KEYS = new Map([
  ['ArrowUp', { y: -1 }],
  ['w', { y: -1 }],
  ['W', { y: -1 }],
  ['ArrowDown', { y: 1 }],
  ['s', { y: 1 }],
  ['S', { y: 1 }],
  ['ArrowLeft', { x: -1 }],
  ['a', { x: -1 }],
  ['A', { x: -1 }],
  ['ArrowRight', { x: 1 }],
  ['d', { x: 1 }],
  ['D', { x: 1 }],
]);

export function createInputController(canvas, cameraApi) {
  const pressed = new Set();
  const drag = { active: false, lastX: 0, lastY: 0 };

  function handleKeyDown(event) {
    if (!MOVEMENT_KEYS.has(event.key)) return;
    pressed.add(event.key);
    event.preventDefault();
  }

  function handleKeyUp(event) {
    pressed.delete(event.key);
  }

  function update() {
    let dx = 0;
    let dy = 0;

    for (const key of pressed) {
      const vector = MOVEMENT_KEYS.get(key);
      dx += vector.x || 0;
      dy += vector.y || 0;
    }

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy);
      cameraApi.camera.x += (dx / length) * cameraApi.camera.speed / cameraApi.camera.zoom;
      cameraApi.camera.y += (dy / length) * cameraApi.camera.speed / cameraApi.camera.zoom;
    }
  }

  function bind() {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    canvas.addEventListener('pointerdown', event => {
      drag.active = true;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener('pointermove', event => {
      if (!drag.active) return;
      cameraApi.camera.x -= (event.clientX - drag.lastX) / cameraApi.camera.zoom;
      cameraApi.camera.y -= (event.clientY - drag.lastY) / cameraApi.camera.zoom;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
    });

    canvas.addEventListener('pointerup', event => {
      drag.active = false;
      canvas.releasePointerCapture(event.pointerId);
    });

    canvas.addEventListener(
      'wheel',
      event => {
        event.preventDefault();
        cameraApi.zoomAt(event.offsetX, event.offsetY, event.deltaY > 0 ? 0.9 : 1.1);
      },
      { passive: false },
    );
  }

  return { bind, update };
}
