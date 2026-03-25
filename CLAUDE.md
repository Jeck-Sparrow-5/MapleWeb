# MapleWeb Development Guide

## Quick Start
- `npm run dev` - Start local development server
- `npm run build` - Build for production
- `npm run serve` - Preview production build
- `tsc --noEmit` - Typecheck without emitting files
- `python3 tools/wz_explorer.py` - Start WZ asset explorer at http://localhost:5555

## Critical Rules

### NEVER build custom UI — always use WZ assets
- All UI elements (dialogs, buttons, panels, scroll frames, name tags, etc.) MUST be rendered using images from the `.wz` JSON files
- Do NOT create HTML DOM overlays (divs, styled elements) for in-game UI
- Do NOT draw custom rectangles/backgrounds with canvas fillRect for UI panels
- The original MapleStory client renders everything from WZ sprite data — this project must do the same
- Use `UI.wz/Basic.img` for common buttons (BtOK, BtCancel, etc.) and dialog frames (Notice, Notice4)
- Use `UI.wz/Login.img` for all login/character select UI elements

### WZ Node Access Patterns
- `WZNode.nGetImage()` returns an `HTMLImageElement` — but its `.width`/`.height` may be 0 until loaded async
- For layout calculations, use known pixel dimensions from WZ data or hardcode them, do NOT rely on `img.width/img.height` immediately after `nGetImage()`
- WZ node properties are stored with `n` prefix: `width` → `nWidth`, `height` → `nHeight`, `value` → `nValue`
- `nGet(key)` returns child node by name; returns empty node if not found (not null)
- `nGetImage()` should ONLY be called on `$canvas` tagged nodes — calling it on `$imgdir` nodes causes corruption
- WZ node structure: `$imgdir` = directory, `$canvas` = image, `$int`/`$string`/`$float`/`$vector` = properties
- Nested access pattern: `node.nGet('parent').nGet('child').nGetImage()` — verify each level is a canvas before calling nGetImage
- Example gotcha: `pageR/0` is an imgdir containing canvas `0`, so need `nGet('pageR').nGet('0').nGet('0').nGetImage()`

### Canvas Coordinate System
- Canvas internal resolution = `window.innerWidth x window.innerHeight` (set by Config.ts goFullScreen)
- Canvas drawing coordinates and CSS pixel coordinates may NOT match if canvas is scaled
- For UI elements that need text input, prefer canvas-rendered keyboard capture over HTML `<input>` elements — HTML inputs don't align with canvas coordinates
- `GameCanvas.drawImage` uses `sw`/`sh` (not `sWidth`/`sHeight`) for source crop
- `GameCanvas.drawText` supports `align: 'center'`

### Login Map Structure
The login screen is a single tall vertical map (`UI.wz/MapLogin.img`) with sections at different Y positions:
- **Login Screen**: Camera at `{ x: -372, y: -308 }`
- **World Select**: Camera at `{ x: -372, y: -914 }`
- **Character Select**: Camera at `{ x: -372, y: -1544 }`
- **Create Character**: Camera at `{ x: -372, y: -2723 }`
- Camera transitions use easing via `Camera.setTopLeft()` + `Camera.update()` called every frame in GameLoop

## Project Architecture

### Core Components
- **GameCanvas** - Main rendering canvas, handles drawing, mouse/keyboard input
- **Gameloop** - Game animation and update loop (calls Camera.update every frame)
- **StateManager** - Manages game states (login, map, etc.)
- **MapleMap** - Represents the game world map
- **MapleCharacter** - Base character class with full sprite composition pipeline
- **MyCharacter** - Player-controlled character (singleton, loaded in LoginState.initialize)
- **Monster** - Enemy entities
- **Physics** - Collision detection and movement
- **Camera** - Viewport management with easing transitions

### Data Management
- **WZManager** - Handles loading and parsing of WZ data files
- **WZNode** - Represents data nodes from WZ files

### Game States
- **LoginState** - Handles login screen, world/channel select, character select, create character
  - Substates: LOGIN_SCREEN, WORLD_SELECT, CHARACTER_SELECT, CREATE_CHARACTER
- **MapState** - Manages gameplay on maps

### Character Rendering Pipeline
1. `MapleCharacter.load()` loads body, head, hair, face, equipment from Character.wz
2. `getDrawableFrames(stance, frame, flipped)` composes all layers (body, head, hair, face, equips) into z-sorted drawable array
3. Each frame has `{ img, x, y, z }` — draw at `pos + frame offset - camera`
4. Equipment attached via `attachEquip(slot, itemId)` — loads from Character.wz subdirectories
5. Stances: stand1, walk1, jump, alert, dead, ladder, etc.
6. Default character: hair 30030, face 20000, skin 0, equips: 1040002 (top), 1060002 (bottom), 1302000 (weapon)

### UI System
- **UILogin** - Login interface (uses object literal pattern, not class)
- **UIMap** - In-game HUD and menus
- **MapleButton** / **MapleStanceButton** - Interactive UI button components using WZ sprites
- **MapleInput** - HTML input overlaid on canvas (used for login username/password)
- **UIMesoDropDialog** - Meso drop dialog using WZ Notice4 assets
- **UILoginNotice** - Login notice dialog using WZ assets
- **DebugDrag** - Debug tool for positioning UI elements (toggle with F9)

### WZ Asset Explorer
- Located at `tools/wz_explorer.py` — Flask web app
- Browse all 22K+ JSON files from wz_client directory
- Search mobs, NPCs, equipment, items by name or ID
- View sprites, parsed data tree, or raw JSON
- Useful for finding asset paths and IDs during development

## Key WZ Asset Locations

### UI Assets
- `UI.wz/Basic.img` — Common buttons (BtOK, BtCancel, BtOK2, BtCancel2), dialog frames (Notice, Notice2-5), scrollbars, cursors
- `UI.wz/Login.img` — Login UI: CharSelect (scroll, nameTag, effect, character slots, pageL/pageR, buttons), WorldSelect, NewChar, Common (frame, step images, BtStart)
- `UI.wz/UIWindow.img` — In-game windows: Item (inventory), Shop, etc.
- `UI.wz/ChatBalloon.img` — Chat balloon 9-patch pieces

### Character Assets
- `Character.wz/0000200X.img` — Body by skin color (X=0-11)
- `Character.wz/0001200X.img` — Head by skin color
- `Character.wz/Hair/000XXXXX.img` — Hair styles
- `Character.wz/Face/000XXXXX.img` — Face styles
- `Character.wz/{Cap,Coat,Pants,Shoes,Glove,Weapon,...}/` — Equipment

### String Lookups
- `String.wz/Mob.img` — Monster names by ID
- `String.wz/Npc.img` — NPC names by ID
- `String.wz/Eqp.img` — Equipment names (nested structure)

## Code Style Guidelines
- **Naming**: Use PascalCase for classes/interfaces, camelCase for variables/methods
- **Formatting**: 2-space indentation, semicolons required, single quotes for strings
- **Typing**: Explicit types for function parameters and returns; avoid `any` where possible
- **Classes**: One class per file named after the class; factory methods use `fromOpts`/`fromWzNode`
- **Imports**: Group imports by source (internal/external); avoid wildcard imports
- **Error Handling**: Use try/catch blocks for async operations; log with console.error
- **Comments**: JSDoc for public methods; inline comments for complex logic
- **Constants**: Store in dedicated files within Constants directory
- **Organization**: Group related functionality in directories (UI, Physics, etc.)

## Project Structure
- **TypeScript-Client/** - Main client application
  - **src/** - Source code
    - **Audio/** - Sound management
    - **Constants/** - Game constants and enums
    - **DropItem/** - Item drop system
    - **Effects/** - Visual effects
    - **Inventory/** - Item management
    - **Net/** - Network packets (LoginPacket, etc.)
    - **Physics/** - Movement and collision
    - **Projectile/** - Projectile system
    - **Stats/** - Character statistics
    - **Tools/** - Utility functions
    - **UI/** - User interface components
    - **wz-utils/** - WZ data file parsing
  - **public/** - Static assets and Maple data files
    - **wz_client/** - MapleStory data files (converted to JSON)
- **tools/** - Development utilities
  - **wz_explorer.py** - WZ asset browser (Flask, port 5555)

## Debugging Tips
- **F9 key** toggles DebugDrag mode — shows green boxes around registered UI elements, click to select (turns red), drag to reposition, offset logged to console
- When positioning UI elements, use DebugDrag to find correct offsets, then hardcode them
- Check browser console for errors
- Use `console.log` for object state inspection
- ~97 pre-existing TypeScript errors (not from our code) — check only for new errors in modified files
- `npm run dev` uses Vite with hot reload

## Common Pitfalls
- `drawImage` parameter `sw`/`sh` NOT `sWidth`/`sHeight` — wrong names silently ignored, draws full image
- `nGetImage()` on non-canvas WZ nodes corrupts rendering — always verify node type
- HTML inputs positioned in CSS pixels don't align with canvas-drawn elements when canvas is scaled
- Camera easing means `setTopLeft` doesn't jump instantly — `Camera.update()` must be called every frame
- `MyCharacter.load()` is async — must await before rendering character sprites
- WZ `charInfo2` image already contains stat labels (JOB, LV, STR, etc.) — only draw values, not labels
- Login map backgrounds repeat vertically — the map extends well below y=-3000
