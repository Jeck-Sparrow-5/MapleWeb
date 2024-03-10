import { CameraInterface } from "./Camera";
import { Position } from "./Effects/DamageIndicator";
import { Rectangle } from "./Physics/Collision";

/**
 * Checks if a point is within a rectangle.
 *
 * @param {int} point.x - X coordinate of point.
 * @param {int} point.y - Y coordinate of point.
 * @param {int} rectangle.x - Left position of rectangle.
 * @param {int} rectangle.y - Top position of rectangle.
 * @param {int} rectangle.width - Width of rectangle.
 * @param {int} rectangle.height - Height of rectangle.
 * @return {Boolean} True if point is within rectangle, false otherwise.
 */
const pointInRectangle = function (
  point: Position,
  rectangle: Rectangle
): boolean {
  return (
    point.x >= rectangle.x &&
    point.x < rectangle.x + rectangle.width &&
    point.y >= rectangle.y &&
    point.y < rectangle.y + rectangle.height
  );
};

/**
 * Checks if two rectangles overlap.
 *
 * @param {int} r1.x - Left position of rectangle 1.
 * @param {int} r1.y - Top position of rectangle 1.
 * @param {int} r1.width - Width of rectangle 1.
 * @param {int} r2.height - Height of rectangle 1.
 * @param {int} r2.x - Left position of rectangle 2.
 * @param {int} r2.y - Top position of rectangle 2.
 * @param {int} r2.width - Width of rectangle 2.
 * @param {int} r2.height - Height of rectangle 2.
 * @return {Boolean} True if rectangles overlap, false otherwise.
 */
const rectanglesOverlap = function (r1: Rectangle, r2: Rectangle): boolean {
  const xOverlap =
    (r1.x >= r2.x && r1.x < r2.x + r2.width) ||
    (r2.x >= r1.x && r2.x < r1.x + r1.width);
  const yOverlap =
    (r1.y >= r2.y && r1.y < r2.y + r2.height) ||
    (r2.y >= r1.y && r2.y < r1.y + r1.height);
  return xOverlap && yOverlap;
};

/**
 * Checks if an image is within a camera's viewport.
 *
 * @param {int} camera.x - Left offset of camera.
 * @param {int} camera.y - Top offset of camera.
 * @param {int} camera.width - Width of camera.
 * @param {int} camera.height - Height of camera.
 * @param {Image} img - Image object.
 * @param {int} dx - Destination x.
 * @param {int} dy - Destination y.
 * @return {Boolean} True if image is within viewport, false otherwise.
 */
const imageInView = function (
  camera: CameraInterface,
  img: any,
  dx: number,
  dy: number
) {
  const r1 = {
    x: camera.x,
    y: camera.y,
    width: camera.width,
    height: camera.height,
  };
  const r2 = {
    x: dx,
    y: dy,
    width: dx + img.width,
    height: dy + img.height,
  };
  return GUIUtil.rectanglesOverlap(r1, r2);
};

const GUIUtil = {
  pointInRectangle,
  rectanglesOverlap,
  imageInView,
};

export default GUIUtil;
