import { MapleStanceButton, BUTTON_STANCE } from "./MapleStanceButton";
import MapleFrameButton from "./MapleFrameButton";
import UICommon from "./UICommon";
import GUIUtil from "../GuiUtils";
import GameCanvas from "../GameCanvas";
import MapleButton from "./MapleButton";
import DragableMenu from "./Menu/DragableMenu";
import { CameraInterface } from "../Camera";

export interface ClickManagerInterface {
  clicked: boolean;
  lastClickedPosition: { x: number; y: number };
  activeButton: any;
  buttons: Set<MapleButton>;
  dragableMenus: any[];
  GameCanvas: GameCanvas;
  initialize: (canvas: GameCanvas) => void;
  doUpdate: (msPerTick: number, camera: any) => void;
  addDragableMenu: (menu: any) => void;
  addButton: (button: any) => void;
  removeButton: (button: any) => void;
  clearButton: () => void;
  isDraggingItem: boolean; // Flag to track item dragging

  chosenMenu: DragableMenu | null;
  lastClickedMenuPosition: { x: number; y: number } | null;
}

const ClickManager = {} as ClickManagerInterface;

// Add a flag to indicate when an item is being dragged
ClickManager.isDraggingItem = false;

ClickManager.initialize = function (canvas: GameCanvas) {
  this.clicked = false;
  this.lastClickedPosition = { x: 0, y: 0 };
  this.activeButton = null;
  this.buttons = new Set<MapleButton>();
  this.dragableMenus = [];
  this.GameCanvas = canvas;
  this.isDraggingItem = false;
};

ClickManager.doUpdate = function (msPerTick: number, camera: CameraInterface) {
  const mousePoint = { x: this.GameCanvas.mouseX, y: this.GameCanvas.mouseY };
  // const mousePoint = UICommon.getMousePosition(this.GameCanvas)
  const clickedOnLastUpdate = this.clicked;
  const clickedOnThisUpdate = this.GameCanvas.clicked;
  const releasedClick = clickedOnLastUpdate && !clickedOnThisUpdate;
  const lastActiveButton = this.activeButton;
  const buttons: MapleButton[] = Array.from(this.buttons.values())
    .filter((button) => !button.isHidden);
  let currActiveButton = null;

  if (buttons.length === 0) {
    return;
  }

  for (const button of buttons) {
    const buttonRect = button.getRect(camera);
    const hoverButton = GUIUtil.pointInRectangle(mousePoint, buttonRect);

    if (hoverButton) {
      currActiveButton = button;
      break;
    }
  }

  // hover event
  if (lastActiveButton !== currActiveButton) {
    this.activeButton = currActiveButton;
    this.buttons.forEach((button) => {
      if (button.constructor === MapleStanceButton) {
        const stanceButton = button as MapleStanceButton;
        if (typeof stanceButton.stances[BUTTON_STANCE.NORMAL] !== 'undefined') {
          stanceButton.stance = BUTTON_STANCE.NORMAL;
        }

        if (this.activeButton === stanceButton) {
          if (stanceButton.hoverAudio) {
            UICommon.playMouseHoverAudio();
          }
          if (typeof stanceButton.stances[BUTTON_STANCE.MOUSE_OVER] !== 'undefined') {
            stanceButton.stance = BUTTON_STANCE.MOUSE_OVER;
          }
        }
      }
    });
  }

  // click event
  for (const button of buttons) {
    if (clickedOnThisUpdate && !clickedOnLastUpdate) {
      // Try handling clicks on dragable menus first
      for (const menu of this.dragableMenus) {
        if (menu.onMouseDown && menu.onMouseDown(mousePoint.x, mousePoint.y)) {
          break;
        }
      }
    }

    if (this.activeButton === button) {
      const originallyClickedButton = GUIUtil.pointInRectangle(
        this.lastClickedPosition,
        button.getRect(camera)
      );
      if (clickedOnThisUpdate) {
        switch (button.constructor) {
          case MapleStanceButton: {
            const stanceButton = button as MapleStanceButton;
            stanceButton.stance = !originallyClickedButton
              ? (typeof stanceButton.stances[BUTTON_STANCE.MOUSE_OVER] !== 'undefined' ? BUTTON_STANCE.MOUSE_OVER : BUTTON_STANCE.NORMAL)
              : (typeof stanceButton.stances[BUTTON_STANCE.PRESSED] !== 'undefined' ? BUTTON_STANCE.PRESSED : BUTTON_STANCE.NORMAL);
            break;
          }
          case MapleFrameButton: {
            break;
          }
        }
      } else {
        switch (button.constructor) {
          case MapleStanceButton: {
            const stanceButton = button as MapleStanceButton;
            if (typeof stanceButton.stances[BUTTON_STANCE.MOUSE_OVER] !== 'undefined') {
              stanceButton.stance = BUTTON_STANCE.MOUSE_OVER;
            }
            const trigger = releasedClick && originallyClickedButton;
            if (trigger) {
              if (button.clickAudio) {
                UICommon.playMouseClickAudio();
              }
              button.trigger();
            }
            break;
          }
          case MapleFrameButton: {
            const frameButton = button as MapleFrameButton;
            const trigger =
              releasedClick && originallyClickedButton && frameButton.canClick;
            if (trigger) {
              frameButton.canClick = false;
              frameButton.canUpdate = true;
              if (button.clickAudio) {
                UICommon.playMouseClickAudio();
              }
            }
            break;
          }
        }
      }

      if (clickedOnThisUpdate) {
        if (!clickedOnLastUpdate) {
          this.lastClickedPosition = mousePoint;
        }
      }
      //   this.clicked = true;
      // } else {
      //   this.clicked = false;
      // }

      break;
    }

    if (!this.activeButton) {
      if (!clickedOnThisUpdate) {
        this.chosenMenu = null;
        this.lastClickedMenuPosition = null;
      } else {
        for (const dragableMenu of this.dragableMenus) {
          const menuRect = dragableMenu.getRect(camera);
          const isMenuUnderMouse = GUIUtil.pointInRectangle(
            mousePoint,
            menuRect
          );
          if (isMenuUnderMouse || this.chosenMenu === dragableMenu) {
            if (this.chosenMenu !== dragableMenu && !clickedOnLastUpdate) {
              this.chosenMenu = dragableMenu;
              this.lastClickedMenuPosition = mousePoint;
            } else {
              if (
                clickedOnThisUpdate &&
                clickedOnLastUpdate &&
                this.lastClickedMenuPosition &&
                !this.isDraggingItem // Don't move menu when dragging an item
              ) {
                // move menu to current mouse position - original mouse position
                const deltaX = mousePoint.x - this.lastClickedMenuPosition.x;
                const deltaY = mousePoint.y - this.lastClickedMenuPosition.y;
                dragableMenu.moveTo({
                  x: dragableMenu.x + deltaX,
                  y: dragableMenu.y + deltaY,
                });

                this.lastClickedMenuPosition = mousePoint;
              }

              break;
            }
          }
        }
      }
    }
  }

  if (clickedOnThisUpdate) {
    this.clicked = true;
  } else {
    this.clicked = false;
  }
};

ClickManager.addDragableMenu = function (menu) {
  this.dragableMenus.push(menu);
};

ClickManager.addButton = function (button: MapleButton) {
  this.buttons.add(button);
};

ClickManager.removeButton = function (button: MapleButton) {
  this.buttons.delete(button);
};

ClickManager.clearButton = function () {
  this.buttons.clear();
};

// Make ClickManager globally accessible for easier access
declare global {
  interface Window {
    ClickManager: ClickManagerInterface;
  }
}

// Expose ClickManager to global scope
window.ClickManager = ClickManager;

export default ClickManager;
