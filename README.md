## Web Maple

Browser-based MapleStory v83 client. Fork of Nodein Maple Web, converted to TypeScript and extended with server connectivity.

## Important

All graphics and sound assets are rights reserved to Nexon. This project is for research and educational purposes only, with no commercial intent.

## Features

### Gameplay
1. Teleportation via portals
2. Mobs render with movement and health bars
3. Stats menu with Maple damage calculations
4. Damage indicators
5. Player walking, jumping, climbing
6. Arrow/projectile attacks against mobs
7. Full-screen mode
8. Touch controls for mobile
9. Accurate EXP and level-up system
10. Mob item drops
11. Item pickup from map

### UI (in-game)
| Key | Window |
|-----|--------|
| `S` | Stats / character info |
| `I` | Item inventory (Equip / Use / Setup / Etc / Cash tabs) |
| `E` | Equipment slots view |
| `K` | Skill book (loads skills from Skill.wz for your job) |
| `Q` | Quest log (in-progress and completed) |
| `M` | Game menu (channel, options, quit) |
| `ESC` | Close open window → or show quit dialog |

- **Minimap** — top-right overlay, player dot, toggle min/normal with button
- **Buff list** — active buff icons top-right with countdown arc; add via `UIBuffList.addBuff()`
- **Chat log** — last 8 messages fade above chat input; server chat packets auto-populate
- **Status messages** — bottom-right fade-out notifications via `UIStatusMessenger.show()`
- **NPC dialogue** — text with Yes/No/Next/Prev buttons
- **NPC shop** — buy/sell tabs, item list with prices; open via `UIShop.open(canvas, items)`
- **Quit dialog** — returns to login screen, disconnects session

### Login flow
1. Login screen with username/password, save ID (persisted to localStorage), forgot ID/password, register, quit
2. World/channel selection with animated scroll
3. Character selection (up to 3 slots, click to select)
4. Gender selection dialog (when account has no gender set)
5. TOS acceptance dialog

### Network (v83 protocol)
Full login-to-game packet flow against a v83 server emulator:

| Direction | Opcode | Purpose |
|-----------|--------|---------|
| → | 1 | Login |
| ← | 0 | Login result |
| ← | 4 | Gender done |
| → | 8 | Set gender |
| → | 11 | Server list request |
| ← | 10 | Server list |
| → | 5 | Character list request |
| ← | 11 | Character list |
| → | 19 | Select character |
| ← | 12 | Server IP (channel server address) |
| → | 20 | Player login (sent to channel server) |
| ← | 17 | Ping → Pong (24) |
| ← | 162/163 | Chat text |

The WebSocket proxy auto-reconnects to the channel server port when `SERVER_IP` is received.

## Getting Started

### Prerequisites
- Node.js 18+
- A v83 MapleStory server emulator (e.g. [Cosmic](https://github.com/P0nk/Cosmic))

### Run

```bash
cd TypeScript-Client
npm install
npm run dev
```

`npm run dev` starts both the Vite dev server and the WebSocket-to-TCP proxy in one process. No separate tool needed.

Set `VITE_WEBSOCKET_URL` in `TypeScript-Client/.env`:

```
VITE_WEBSOCKET_URL=ws://127.0.0.1:8089
```

Leave it empty to run in offline/local UI mode (no server required).

### WebSocket Proxy

The proxy is embedded in Vite as a plugin ([vite.config.ts](TypeScript-Client/vite.config.ts)).

| Env var | Default | Purpose |
|---------|---------|---------|
| `WS_PORT` | `8089` | WebSocket listen port |
| `TCP_HOST` | `127.0.0.1` | Maple server host |
| `TCP_PORT` | `8484` | Login server TCP port |

When the client switches to a channel server, the proxy reconnects to the new port automatically via `?port=<channelPort>` on the WebSocket URL. A standalone proxy is also available in `proxy/` (`npm start`).

### Server Emulator (v83)
https://github.com/P0nk/Cosmic

## Project Structure

```
TypeScript-Client/
  src/
    Net/
      PacketHandlers/   ← inbound packet handlers
      Packets/          ← outbound packet classes
    UI/
      Menu/             ← draggable menu sprites (inventory, stats)
      UISkillBook.ts    ← skill window (K)
      UIEquipInventory.ts ← equip slots (E)
      UIBuffList.ts     ← buff icon overlay
      UIShop.ts         ← NPC shop
      UIGameMenu.ts     ← game menu (M)
      UIQuestLog.ts     ← quest log (Q)
      UIMiniMap.ts      ← minimap overlay
      UIStatusMessenger.ts ← fade-out notifications
      UIQuit.ts         ← quit confirmation dialog
      UIGender.ts       ← gender selection (login)
    Constants/          ← enums, tables, job data
    wz-utils/           ← WZ file loader and node tree
  public/
    wz_client/          ← WZ data (Base, Character, Effect, Item,
                           Map, Mob, Skill, String, UI, etc.)
proxy/                  ← standalone WS→TCP proxy (optional)
```
