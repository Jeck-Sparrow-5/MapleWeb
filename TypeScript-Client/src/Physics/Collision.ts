import { Position } from "../Effects/DamageIndicator";

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function areRectanglesOverlappingWithMinOverlap(
  rect1: Rectangle,
  rect2: Rectangle,
  minOverlapPercentage = 5
) {
  const rect1Right = rect1.x + rect1.width;
  const rect2Right = rect2.x + rect2.width;
  const rect1Bottom = rect1.y + rect1.height;
  const rect2Bottom = rect2.y + rect2.height;

  const horizontalOverlap = rect1.x < rect2Right && rect1Right > rect2.x;
  const verticalOverlap = rect1.y < rect2Bottom && rect1Bottom > rect2.y;

  if (!horizontalOverlap || !verticalOverlap) {
    return false;
  }

  const overlapX =
    Math.min(rect1Right, rect2Right) - Math.max(rect1.x, rect2.x);
  const overlapY =
    Math.min(rect1Bottom, rect2Bottom) - Math.max(rect1.y, rect2.y);

  const overlapArea = overlapX * overlapY;
  const rect1Area = rect1.width * rect1.height;
  const rect2Area = rect2.width * rect2.height;

  const minOverlapArea =
    Math.min(rect1Area, rect2Area) * (minOverlapPercentage / 100);

  return overlapArea >= minOverlapArea;
}

export function areAnyRectanglesOverlapping(
  arrayOfRect: Rectangle[],
  targetRect: Rectangle,
  minOverlapPercentage = 5
) {
  for (const rect of arrayOfRect) {
    if (
      areRectanglesOverlappingWithMinOverlap(
        rect,
        targetRect,
        minOverlapPercentage
      )
    ) {
      return true;
    }
  }
  return false;
}

export function isPositionInsideRect(position: Position, rect: Rectangle) {
  return (
    position.x >= rect.x &&
    position.x <= rect.x + rect.width &&
    position.y >= rect.y &&
    position.y <= rect.y + rect.height
  );
}

export function isPositionInsideRectByConrners(
  position: Position,
  rectCorner1: Position,
  rectCorner2: Position
) {
  const { x, y } = position;
  const { x: x1, y: y1 } = rectCorner1;
  const { x: x2, y: y2 } = rectCorner2;

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

export function findMinXY(rectangles: Rectangle[]) {
  if (rectangles.length === 0) {
    return { minX: 0, minY: 0 };
  }

  let minX = rectangles[0].x;
  let minY = rectangles[0].y;

  for (const rect of rectangles) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
  }

  return { minX, minY };
}

export function findMaxXY(rectangles: Rectangle[]) {
  if (rectangles.length === 0) {
    return { maxX: 0, maxY: 0 };
  }

  let maxX = rectangles[0].x;
  let maxY = rectangles[0].y;

  for (const rect of rectangles) {
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return { maxX, maxY };
}
