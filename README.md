## MapleWeb

Browser-based MapleStory v83 client. Connects to a v83 server emulator over WebSocket (proxied to TCP), with full login-to-game packet flow, live multiplayer, and a complete in-game UI built from WZ assets.

> **Notice:** All graphics and sound assets are rights reserved to Nexon. This project is for research and educational purposes only, with no commercial intent.

---

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

`npm run dev` starts the Vite dev server with an embedded WebSocket-to-TCP proxy — no separate tool or binary required.

Set `VITE_WEBSOCKET_URL` in `TypeScript-Client/.env`:

```
VITE_WEBSOCKET_URL=ws://127.0.0.1:8089
```

Leave it empty to run in **offline mode** — the UI and map viewer work without a server.

### WebSocket Proxy

The proxy is embedded in Vite as a plugin ([vite.config.ts](TypeScript-Client/vite.config.ts)). A standalone fallback is in `proxy/` (`npm start`).

| Env var | Default | Purpose |
|---------|---------|---------|
| `WS_PORT` | `8089` | WebSocket listen port |
| `TCP_HOST` | `127.0.0.1` | Maple server host |
| `TCP_PORT` | `8484` | Login server TCP port |

When `SERVER_IP` is received, the client reconnects the WebSocket to the channel server port automatically via `?port=<channelPort>`.

---

## Features

### Gameplay
- Player movement: walk, jump, climb ropes/ladders
- Portal teleportation (map transitions)
- Melee and ranged/projectile attacks against monsters
- Skill use with job-specific animations and effects
- Hit flash effects and damage indicators on monsters
- Monster movement, health bars, and death animations
- Monster status overlays: frozen (❄), stunned (★), poisoned (☠)
- Mob item drops with physics; walk-over pickup
- Accurate EXP gain and level-up system
- Reactor sprites with animation frames; click to activate
- Mist/door entity rendering
- Pet rendering (spawn/movement from server packets)
- Auto-potion: uses HP pot at <50% HP, MP pot at <30% MP (2 s cooldown)
- Full-screen mode
- Touch/joystick controls for mobile

### Multiplayer (live server)
- Other players rendered with name tags and chat bubbles
- Player movement synced via MOVE_PLAYER packets (~10×/s when moving)
- Spawn/despawn handled by server packets
- NPC click sends NPC_TALK to server; response shown in dialogue UI
- Chat messages sent and received in real time
- Inventory operations (equip, unequip, drop, use) synced with server

### Login & Character Flow
1. Login screen: username/password, save ID (localStorage), forgot ID/password link, register link, quit
2. TOS acceptance dialog
3. Gender selection dialog (first-time accounts)
4. World/channel selection with server load indicators
5. Character selection: up to 3 slots, animated character preview from WZ sprites
6. PIC (Personal ID Code) support:
   - `requirePic=0`: direct select
   - `requirePic=1`: enter existing PIC
   - `requirePic=2`: register new PIC (double-entry confirmation)
7. Character creation with name check and race/class selection

---

## UI Windows

| Key | Window |
|-----|--------|
| `S` | Character stats / info |
| `I` | Item inventory (Equip / Use / Setup / Etc / Cash tabs) |
| `E` | Equipment slots (20 slots: hat, face, eye, ear, top, bottom, shoes, gloves, cape, weapon, shield, ring×4, pendant×2, emblem, medal, shoulder, belt) |
| `K` | Skill book (loads skills from Skill.wz for your job; SP up, hotbar assign, passive detection) |
| `Q` | Quest log (in-progress and completed) |
| `M` | Game menu (channel list, options, quit) |
| `ESC` | Close topmost open dialog → quit confirmation |
| `1`–`0`, `F1`–`F10` | Use hotbar skill/item at that slot |

### Always-on overlays
| Component | Description |
|-----------|-------------|
| **Minimap** | Top-right; WZ map image or bounds-scaled fallback; yellow dots = portals, blue = NPCs, white = other players, red = you; hover shows NPC list |
| **Skill hotbar** | 20 slots at bottom; selected slot gold-bordered; cooldown arc overlay; assign skills via right-click in skill book |
| **Buff list** | Active buff icons with countdown arc (top-right) |
| **Chat log** | Last 8 messages above input; fades; supports server and local chat |
| **Name tags** | Above every character; colored by GM/player status |
| **Chat bubbles** | Floating speech bubbles above characters; auto-expire |
| **Status messenger** | Bottom-right fade-out notifications |
| **Damage indicators** | Floating damage numbers from attacks |
| **Tooltips** | Hover tooltips on inventory and skill book items |
| **Party HP bars** | Party member HP/MP bars drawn in-world |

### Dialogue & shop
| Window | Description |
|--------|-------------|
| **NPC dialogue** | Text (word-wrapped), Yes/No, Next/Prev, selection list; sends NpcTalkMore packets |
| **NPC shop** | Buy/sell tabs, item list with prices, icon from Item.wz |
| **Storage** | Meso and item storage with slot grid |
| **Quit dialog** | Disconnect and return to login |
| **Key config** | Rebind keyboard shortcuts |
| **Channel** | Switch channel in-game |
| **World map** | Full world map overlay |
| **User list** | Online players list |
| **Option menu** | Graphics/audio settings |

---

## Network — v83 Protocol

### Inbound packet handlers

| Opcode | Handler | Description |
|--------|---------|-------------|
| 0 | LoginStatusHandler | Login accepted/rejected |
| 4 | GenderDoneHandler | Gender set confirmation |
| 10 | ServerListHandler | World/channel list |
| 11 | CharacterListHandler | Character slot data |
| 12 | ServerIPHandler | Channel server address → proxy reconnect |
| 17 | PingHandler | Heartbeat ping → pong |
| 35 | GameplayHandlers (RecalculateStats) | Force stat recalc |
| 52 | GameplayHandlers (GatherResult) | Inventory gather result |
| 53 | GameplayHandlers (SortResult) | Inventory sort result |
| 61 | AddNewCharHandler | New character created |
| 67 | CharManageHandlers (DeleteChar) | Character deleted |
| 68 | CharManageHandlers (CheckCharName) | Name availability result |
| 77 | GameplayHandlers (WeekEventMessage) | Event message |
| 100 | StatChangedHandler | Player stat update |
| 101 | InventoryOperationHandler | Inventory add/remove/move |
| 103 | BuffSkillHandlers (ApplyBuff) | Buff applied |
| 104 | BuffSkillHandlers (CancelBuff) | Buff cancelled |
| 105 | BuffSkillHandlers (UpdateSkill) | Skill level updated |
| 124 | GameplayHandlers (SkillMacros) | Skill macro list |
| 125 | SetFieldHandler | Map load / respawn |
| 138 | GameplayHandlers (FieldEffect) | Map effect |
| 160 | NpcHandlers (NpcTalk) | NPC dialogue open |
| 161 | NpcHandlers (NpcTalkMore) | NPC dialogue continue |
| 162 | NpcHandlers (NpcShopOpen) | NPC shop open |
| 163 | ChatTextHandler | Chat message received |
| 167 | GameplayHandlers (ScrollResult) | Scroll/upgrade result |
| 168 | GameplayHandlers (SpawnPet) | Pet spawned |
| 170 | GameplayHandlers (MovePet) | Pet moved |
| 176 | SpawnMonsterHandler | Monster spawn |
| 177 | SpawnMonsterHandler (control) | Monster spawn (control) |
| 178 | CriticalHandlers (KillMonster) | Monster killed |
| 180 | CriticalHandlers (MobHit) | Monster hit |
| 181 | CriticalHandlers (MobMove) | Monster movement |
| 183 | SpawnNpcHandler | NPC spawn |
| 185 | SpawnNpcHandler (request) | NPC spawn request |
| 186 | CriticalHandlers (CloseRangeAttack) | Melee attack result |
| 187 | CriticalHandlers (RangedAttack) | Ranged attack result |
| 192 | CriticalHandlers (DamagePlayer) | Player damaged |
| 197 | SpawnPlayerHandler | Other player spawn |
| 198 | GameplayHandlers (ShowForeignEffect) | Remote skill effect |
| 200 | MapMessageHandlers (MovePlayer) | Other player moved |
| 201 | MapMessageHandlers (RemovePlayer) | Other player left |
| 206 | MapMessageHandlers (PlayerChat) | Other player chat |
| 209 | MapMessageHandlers (PlayerEmotion) | Player emote |
| 214 | DropItemHandler (Drop) | Item dropped on map |
| 215 | DropItemHandler (Remove) | Item removed from map |
| 234 | BuffSkillHandlers (Cooldown) | Skill cooldown set |
| 270 | ChatQuestHandlers (ServerMessage) | Server message |
| 271 | ChatQuestHandlers (QuestInfo) | Quest info update |
| 277 | GameplayHandlers (HitReactor) | Reactor hit |
| 279 | GameplayHandlers (SpawnReactor) | Reactor spawned |
| 280 | GameplayHandlers (RemoveReactor) | Reactor removed |
| 304 | FlowHandlers (BuddyList) | Buddy list update |
| 305 | FlowHandlers (GroupChat) | Party/guild chat |

### Outbound packets

| Class | Opcode | Description |
|-------|--------|-------------|
| LoginPacket | 1 | Username + password |
| AcceptTOSPacket | 7 | Accept terms of service |
| GenderPacket | 8 | Set account gender |
| CharacterListRequestPacket | 5 | Request character list for world/channel |
| SelectCharPacket | 19 | Select character (no PIC) |
| SelectCharPicPacket | 24 | Select character with PIC |
| RegisterPicPacket | 29 | Register new PIC |
| PlayerLoginPacket | 20 | Player login to channel server |
| CreateCharPacket | 22 | Create new character |
| DeleteCharPacket | 23 | Delete character |
| MovePlayerPacket | 41 | Player position update |
| AttackPacket | 44 | Melee/ranged attack |
| ChatPacket | 49 | Send chat message |
| PickupItemPacket | 130 | Pick up dropped item |
| UseSkillPacket | 91 | Use skill |
| ItemPackets (Equip) | 87 | Equip item |
| ItemPackets (Unequip) | 88 | Unequip item |
| ItemPackets (Drop) | 90 | Drop item |
| ItemPackets (Use) | 44 | Use consumable item |
| NpcInteractPacket | 58 | Open NPC talk |
| NpcTalkMorePacket | 59 | NPC dialogue action |
| ShopPacket (Buy) | 62 | Buy from NPC shop |
| ShopPacket (Sell) | 62 | Sell to NPC shop |
| ShopPacket (Close) | 63 | Close NPC shop |

---

## WZ Data Usage

| WZ file | Used for |
|---------|----------|
| `Character.wz` | Player/character sprite layers (body, head, face, hair, equipment) |
| `Skill.wz` | Skill icons, animations, metadata (level, masterLevel, passive flag) |
| `Item.wz` | Item icons and equipment stats in inventory/equip slots |
| `String.wz` | Item names, NPC names, skill descriptions, map names, quest text |
| `Map.wz` | Tiles, backgrounds, footholds, portals, NPC/mob positions, reactor data, minimap image |
| `Mob.wz` | Monster sprites, frame animations, hit/death sequences |
| `NPC.wz` | NPC sprite layers and animations |
| `UI.wz` | Login screen, buttons, inventory panels, minimap chrome, status bar, chat, hotbar |
| `Effect.wz` | Hit effects, skill visual effects, portal particles |

---

## Project Structure

```
MapleWeb/
├── TypeScript-Client/
│   ├── vite.config.ts            ← Vite + embedded WS→TCP proxy plugin
│   ├── src/
│   │   ├── main.ts
│   │   ├── GameCanvas.ts
│   │   ├── Camera.ts
│   │   ├── MapleMap.ts           ← Map loading, rendering, entity management
│   │   ├── MapleCharacter.ts     ← Character sprite, physics, combat
│   │   ├── MyCharacter.ts        ← Local player singleton
│   │   ├── MapState.ts           ← In-game state, all UI init, game loop
│   │   ├── SessionManager.ts     ← WebSocket lifecycle + channel reconnect
│   │   ├── StateManager.ts       ← Login/game state machine
│   │   ├── LoginState.ts         ← Login sub-states
│   │   ├── Config.ts
│   │   ├── Timer.ts
│   │   ├── NPC.ts
│   │   ├── Portal.ts
│   │   ├── Tile.ts
│   │   ├── Obj.ts
│   │   ├── Background.ts
│   │   ├── FootHold.ts
│   │   ├── Audio/
│   │   │   ├── AudioManager.ts
│   │   │   └── PlayAudio.ts
│   │   ├── Constants/
│   │   │   ├── AttackType.ts
│   │   │   ├── EquipType.ts
│   │   │   ├── ExpTable.ts
│   │   │   ├── Jobs.ts
│   │   │   ├── Drops/DropData.ts
│   │   │   ├── Inventory/
│   │   │   │   └── ItemConstants.ts
│   │   │   ├── Mob/Mob.ts
│   │   │   └── enums/
│   │   │       ├── ClimbDirections.ts
│   │   │       ├── Stance.ts
│   │   │       └── WZFiles.ts
│   │   ├── DropItem/
│   │   │   ├── DropItemPhysics.ts
│   │   │   ├── DropItemSprite.ts
│   │   │   ├── DropRandomizer.ts
│   │   │   └── MonsterDropEntry.ts
│   │   ├── Effects/
│   │   │   └── DamageIndicator.ts
│   │   ├── Inventory/
│   │   │   ├── Inventory.ts
│   │   │   └── Item.ts
│   │   ├── Physics/
│   │   │   └── Collision.ts
│   │   ├── Projectile/
│   │   │   ├── Projectile.ts
│   │   │   └── ProjectilePhysics.ts
│   │   ├── Net/
│   │   │   ├── Cryptography.ts
│   │   │   ├── MessageProcessor.ts
│   │   │   ├── PacketHandler.ts
│   │   │   ├── PacketHandlerRegistry.ts
│   │   │   ├── InPacket.ts               ← All inbound opcodes
│   │   │   ├── OutPacket.ts              ← All outbound opcodes + helpers
│   │   │   ├── Models/
│   │   │   │   ├── Character.ts
│   │   │   │   ├── Channel.ts
│   │   │   │   └── World.ts
│   │   │   ├── PacketHandlers/
│   │   │   │   ├── AddNewCharHandler.ts
│   │   │   │   ├── BuffSkillHandlers.ts
│   │   │   │   ├── CharacterListHandler.ts
│   │   │   │   ├── CharManageHandlers.ts
│   │   │   │   ├── ChatQuestHandlers.ts
│   │   │   │   ├── ChatTextHandler.ts
│   │   │   │   ├── CriticalHandlers.ts
│   │   │   │   ├── DropItemHandler.ts
│   │   │   │   ├── FlowHandlers.ts
│   │   │   │   ├── GameplayHandlers.ts
│   │   │   │   ├── GenderDoneHandler.ts
│   │   │   │   ├── InventoryOperationHandler.ts
│   │   │   │   ├── LoginStatusHandler.ts
│   │   │   │   ├── MapMessageHandlers.ts
│   │   │   │   ├── MiscHandlers.ts
│   │   │   │   ├── NpcHandlers.ts
│   │   │   │   ├── PingHandler.ts
│   │   │   │   ├── ServerIPHandler.ts
│   │   │   │   ├── ServerListHandler.ts
│   │   │   │   ├── SetFieldHandler.ts
│   │   │   │   ├── SpawnMonsterHandler.ts
│   │   │   │   ├── SpawnNpcHandler.ts
│   │   │   │   ├── SpawnPlayerHandler.ts
│   │   │   │   └── StatChangedHandler.ts
│   │   │   └── Packets/
│   │   │       ├── AcceptTOSPacket.ts
│   │   │       ├── AttackPacket.ts
│   │   │       ├── CharacterListRequestPacket.ts
│   │   │       ├── ChatPacket.ts
│   │   │       ├── CreateCharPacket.ts
│   │   │       ├── DeleteCharPacket.ts
│   │   │       ├── GenderPacket.ts
│   │   │       ├── ItemPackets.ts
│   │   │       ├── LoginPacket.ts
│   │   │       ├── MovePlayerPacket.ts
│   │   │       ├── NpcInteractPacket.ts
│   │   │       ├── PickupItemPacket.ts
│   │   │       ├── PicPackets.ts
│   │   │       ├── PlayerLoginPacket.ts
│   │   │       ├── SelectCharPacket.ts
│   │   │       ├── ShopPacket.ts
│   │   │       └── UseSkillPacket.ts
│   │   ├── UI/
│   │   │   ├── ClickManager.ts
│   │   │   ├── FrameAnimation.ts
│   │   │   ├── MapleButton.ts
│   │   │   ├── MapleFrameButton.ts
│   │   │   ├── MapleInput.ts
│   │   │   ├── MapleStanceButton.ts
│   │   │   ├── TouchJoyStick.ts
│   │   │   ├── CharSelectPreview.ts      ← Per-slot character rendering
│   │   │   ├── ChatBubbleRenderer.ts     ← Floating chat bubbles
│   │   │   ├── NameTagRenderer.ts        ← Character name tags
│   │   │   ├── SkillEffectRenderer.ts    ← Skill visual effects
│   │   │   ├── TooltipRenderer.ts        ← Hover tooltips
│   │   │   ├── UIBuffList.ts
│   │   │   ├── UIChannel.ts
│   │   │   ├── UICharInfo.ts
│   │   │   ├── UICommon.ts
│   │   │   ├── UIEquipInventory.ts       ← 20-slot equip window
│   │   │   ├── UIGameMenu.ts
│   │   │   ├── UIGender.ts
│   │   │   ├── UIKeyConfig.ts
│   │   │   ├── UILogin.ts                ← Full login + char select
│   │   │   ├── UILoginLoading.ts
│   │   │   ├── UILoginNotice.ts
│   │   │   ├── UILoginTOS.ts
│   │   │   ├── UIMap.ts                  ← In-game HUD bar + button wiring
│   │   │   ├── UIMiniMap.ts              ← Minimap with markers
│   │   │   ├── UINpcTalk.ts              ← NPC dialogue (all types)
│   │   │   ├── UINotice.ts
│   │   │   ├── UIOptionMenu.ts
│   │   │   ├── UIPartyHP.ts
│   │   │   ├── UIQuestLog.ts
│   │   │   ├── UIQuit.ts
│   │   │   ├── UIRaceSelect.ts
│   │   │   ├── UIShop.ts
│   │   │   ├── UISkillBook.ts            ← SP up, passive detect, hotbar assign
│   │   │   ├── UISkillHotbar.ts          ← 20 slots, cooldown arcs
│   │   │   ├── UIState.ts
│   │   │   ├── UIStatusMessenger.ts
│   │   │   ├── UIStorage.ts
│   │   │   ├── UIUserList.ts
│   │   │   ├── UIWorldMap.ts
│   │   │   └── Menu/
│   │   │       ├── DragableMenu.ts
│   │   │       ├── GeneralMenuSprite.ts
│   │   │       └── StatsMenuSprite.ts
│   │   └── wz-utils/
│   │       ├── WZManager.ts
│   │       ├── WZNode.ts
│   │       ├── ItemIconLoader.ts         ← Async icon cache from Item.wz
│   │       ├── ItemNameLoader.ts         ← Async name cache from String.wz
│   │       └── base64headers.ts
│   └── public/
│       └── wz_client/                    ← WZ data (Base, Character, Effect,
│                                            Item, Map, Mob, NPC, Skill,
│                                            String, UI, etc.)
└── proxy/                                ← Standalone WS→TCP proxy (optional)
    └── index.js
```

---

## Architecture Notes

**Dual mode:** `SessionManager.isConnected()` gates whether WZ data or server data is authoritative. Offline mode renders from WZ; online mode populates entities from server packets and skips WZ mob/NPC placement.

**WZ type system:** `WZNode.nGet()` returns `any`; `WZManager.get()` returns `Promise<any>`. This keeps all WZ consumers free of complex union types.

**Proxy dynamic port:** Login server runs on TCP 8484; channel servers run on different ports. On `SERVER_IP` receipt, `SessionManager.reconnect(channelPort)` reconnects the WebSocket with `?port=<channelPort>`, and the proxy opens a new TCP connection to that port.

**PIC flow:** `CharacterListHandler` reads `requirePic` (0/1/2). UILogin dispatches `SelectCharPacket`, `SelectCharPicPacket`, or `RegisterPicPacket` accordingly.

**Skill hotbar:** `UISkillHotbar` exports `selectedHotbarSlot` and `assignSkillToSelectedSlot()`. Right-clicking a skill in UISkillBook calls the latter. Cooldown arcs are driven by opcode 234 (COOLDOWN) packets.

**Character sprites:** `CharSelectPreview` lazily constructs real `MapleCharacter` instances per character ID and calls `draw()` at the slot's world position, giving accurate equipment previews at the character select screen.
