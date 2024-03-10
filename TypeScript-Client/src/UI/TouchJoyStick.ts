export enum JoyStickDirections {
  N = "N",
  NE = "NE",
  E = "E",
  SE = "SE",
  S = "S",
  SW = "SW",
  W = "W",
  NW = "NW",
  C = "C", // Center
}

export declare class JoyStick {
  constructor(container: string, options: any, callback: Function);

  /**
   * Represents the x position of the cursor relative to the Canvas.
   * Values range from -100 to +100.
   */
  x: number;

  /**
   * Represents the y position of the cursor relative to the Canvas.
   * Values range from -100 to +100.
   */
  y: number;

  /**
   * Provides the position of the cursor relative to the Canvas and its dimensions.
   * Values range from -100 to +100.
   */
  xPosition: number;
  yPosition: number;

  /**
   * Provides the direction of the cursor as a cardinal point string.
   * Possible values: 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'C' (center).
   */
  cardinalDirection: JoyStickDirections;

  /**
   * Moves the JoyStick in the specified direction.
   * @param direction - The direction to move the JoyStick.
   */
  move(direction: string): void;

  /**
   * Returns the x position of the cursor relative to the Canvas and its dimensions.
   * @returns The x position.
   */
  GetPosX(): number;

  /**
   * Returns the y position of the cursor relative to the Canvas and its dimensions.
   * @returns The y position.
   */
  GetPosY(): number;

  /**
   * Returns the direction of the cursor as a cardinal point string.
   * @returns The cardinal direction.
   */
  GetDir(): string;

  /**
   * Returns the x value between -100 to +100 independently of the size of the Canvas.
   * @returns The x value.
   */
  GetX(): number;

  /**
   * Returns the y value between -100 to +100 independently of the size of the Canvas.
   * @returns The y value.
   */
  GetY(): number;

  centerX: number;
  centerY: number;
}

// https://github.com/bobboteck/JoyStick
const init = () => {
  var Joy1 = new JoyStick(
    "joyDiv",
    {
      internalFillColor: "#00CCFF",
      internalStrokeColor: "#FFFFFF",
      externalStrokeColor: "#FFFFFF",
    },
    function (stickData: any) {
      Joy1.cardinalDirection = stickData.cardinalDirection;
    }
  );
  console.log(Joy1);
  Joy1.centerX = Joy1.GetPosX();
  Joy1.centerY = Joy1.GetPosX();
  return Joy1;
};

const TouchJoyStick = {
  init,
};

export default TouchJoyStick;
