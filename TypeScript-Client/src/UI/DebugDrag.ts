/**
 * Debug drag mode — toggle with F9.
 * Lets you drag named elements on the canvas and shows their x,y positions.
 *
 * Usage:
 *   // Before drawing, register the element at its current position:
 *   DebugDrag.register('myElement', baseX, baseY, width, height);
 *   // Get the adjusted position (base + drag offset):
 *   const pos = DebugDrag.get('myElement');
 *   // Draw at pos.x, pos.y
 *
 *   // At end of render:
 *   DebugDrag.drawAll(canvas);
 *
 * In debug mode:
 *   - Click any green box to select it (turns red)
 *   - Drag to move it
 *   - Click elsewhere to deselect
 *   - All positions logged to console on release
 */

interface DragElement {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  origX: number;
  origY: number;
  offsetX: number;
  offsetY: number;
}

let enabled = false;
let elements: Map<string, DragElement> = new Map();
let selected: string | null = null;
let dragging = false;
let dragStartMouseX = 0;
let dragStartMouseY = 0;
let dragStartOffsetX = 0;
let dragStartOffsetY = 0;
let lastMouseDown = false;

window.addEventListener('keydown', (e) => {
  if (e.key === 'F9') {
    enabled = !enabled;
    if (enabled) {
      console.log('[DebugDrag] ENABLED — click to select, drag to move. F9 to disable.');
      console.log('[DebugDrag] Current offsets:');
      elements.forEach((el) => {
        if (el.offsetX !== 0 || el.offsetY !== 0) {
          console.log(`  ${el.name}: (${Math.round(el.offsetX)}, ${Math.round(el.offsetY)})`);
        }
      });
    } else {
      console.log('[DebugDrag] DISABLED');
      selected = null;
      dragging = false;
    }
  }
});

const DebugDrag = {
  get enabled() { return enabled; },

  register(name: string, origX: number, origY: number, w: number, h: number) {
    let el = elements.get(name);
    if (!el) {
      el = { name, x: origX, y: origY, w, h, origX, origY, offsetX: 0, offsetY: 0 };
      elements.set(name, el);
    }
    el.origX = origX;
    el.origY = origY;
    el.x = origX + el.offsetX;
    el.y = origY + el.offsetY;
    el.w = w;
    el.h = h;
  },

  get(name: string): { x: number; y: number } {
    const el = elements.get(name);
    if (!el) return { x: 0, y: 0 };
    return { x: el.x, y: el.y };
  },

  update(mx: number, my: number, isMouseDown: boolean) {
    if (!enabled) return;

    const justPressed = isMouseDown && !lastMouseDown;
    const justReleased = !isMouseDown && lastMouseDown;
    lastMouseDown = isMouseDown;

    if (justPressed) {
      // Check if clicking on an element — prefer smallest (most specific) element
      let found = false;
      let bestMatch: DragElement | null = null;
      let bestArea = Infinity;
      for (const [name, el] of elements) {
        if (mx >= el.x && mx <= el.x + el.w && my >= el.y && my <= el.y + el.h) {
          const area = el.w * el.h;
          if (area < bestArea) {
            bestArea = area;
            bestMatch = el;
          }
        }
      }
      if (bestMatch) {
        selected = bestMatch.name;
        dragging = true;
        dragStartMouseX = mx;
        dragStartMouseY = my;
        dragStartOffsetX = bestMatch.offsetX;
        dragStartOffsetY = bestMatch.offsetY;
        found = true;
      }
      if (!found) {
        selected = null;
        dragging = false;
      }
    }

    if (dragging && selected && isMouseDown) {
      const el = elements.get(selected)!;
      el.offsetX = dragStartOffsetX + (mx - dragStartMouseX);
      el.offsetY = dragStartOffsetY + (my - dragStartMouseY);
      el.x = el.origX + el.offsetX;
      el.y = el.origY + el.offsetY;
    }

    if (justReleased && dragging && selected) {
      const el = elements.get(selected)!;
      console.log(`[DebugDrag] ${el.name}: use (${Math.round(el.x)}, ${Math.round(el.y)}) in code`);
      dragging = false;
    }
  },

  drawAll(canvas: any) {
    if (!enabled) return;

    // Header
    canvas.context.save();
    canvas.context.fillStyle = 'rgba(255, 0, 0, 0.85)';
    canvas.context.fillRect(0, 0, 200, 22);
    canvas.context.fillStyle = '#ffffff';
    canvas.context.font = 'bold 13px monospace';
    canvas.context.fillText('DEBUG DRAG [F9]', 8, 16);
    canvas.context.restore();

    // Draw all registered elements
    elements.forEach((el) => {
      const isSelected = selected === el.name;
      canvas.context.save();

      // Box
      canvas.context.strokeStyle = isSelected ? '#ff0000' : '#00ff00';
      canvas.context.lineWidth = isSelected ? 2 : 1;
      canvas.context.setLineDash(isSelected ? [] : [4, 4]);
      canvas.context.strokeRect(el.x, el.y, el.w, el.h);

      // Label — show ABSOLUTE position (what to put in code)
      const label = `${el.name} (${Math.round(el.x)},${Math.round(el.y)})`;
      canvas.context.fillStyle = 'rgba(0,0,0,0.75)';
      canvas.context.fillRect(el.x, el.y - 15, label.length * 7 + 6, 15);
      canvas.context.fillStyle = isSelected ? '#ff4444' : '#00ff00';
      canvas.context.font = '11px monospace';
      canvas.context.fillText(label, el.x + 3, el.y - 3);

      canvas.context.restore();
    });

    // Show selected element info larger at bottom
    if (selected) {
      const el = elements.get(selected);
      if (el) {
        canvas.context.save();
        canvas.context.fillStyle = 'rgba(0,0,0,0.8)';
        canvas.context.fillRect(0, canvas.context.canvas.height - 28, 500, 28);
        canvas.context.fillStyle = '#ffff00';
        canvas.context.font = 'bold 14px monospace';
        canvas.context.fillText(
          `${el.name}  pos: (${Math.round(el.x)}, ${Math.round(el.y)})  [use these values in code]`,
          10,
          canvas.context.canvas.height - 8
        );
        canvas.context.restore();
      }
    }
  },

  reset() {
    elements.forEach((el) => {
      el.offsetX = 0;
      el.offsetY = 0;
    });
  },

  clear() {
    elements.clear();
    selected = null;
    dragging = false;
  }
};

export default DebugDrag;
