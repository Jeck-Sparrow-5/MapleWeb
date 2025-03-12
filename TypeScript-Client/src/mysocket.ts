// Socket.io client for multiplayer functionality
import MapleMap from "./MapleMap";
import MyCharacter from "./MyCharacter";
import MapleCharacter from "./MapleCharacter";
import { Physics } from "./Physics";
import Monster from "./Monster";
import Inventory from "./Inventory/Inventory";
import Stats from "./Stats/Stats";

interface PlayerState {
  id: string;
  x: number;
  y: number;
  stance: string;
  frame: number;
  flipped: boolean;
  name: string;
  hair: number;
  face: number;
  skin: number;  // Used as skinColor in character creation
  mapId: number;
  level: number;
  job: number;
  hp: number;
  maxHp: number;
  attacking: boolean;
}

interface PlayerUpdate {
  x: number;
  y: number;
  stance: string;
  frame: number;
  flipped: boolean;
  mapId: number;
  attacking: boolean;
}

interface MonsterUpdate {
  id: number;
  x: number;
  y: number;
  stance: string;
  frame: number;
  flipped: boolean;
  hp: number;
  maxHp: number;
  mapId: number;
}

interface DamageEvent {
  sourceId: string;
  targetId: number;
  damage: number;
  mapId: number;
}

interface ChatMessage {
  playerId: string;
  message: string;
  mapId: number;
}

class MySocket {
  socket: WebSocket | null = null;
  playerId: string = "";
  otherPlayers: Map<string, MapleCharacter> = new Map();
  isConnected: boolean = false;
  reconnectAttempts: number = 0;
  maxReconnectAttempts: number = 5;
  reconnectInterval: number = 3000; // 3 seconds
  serverUrl: string = "ws://localhost:3001"; // Default development server
  lastUpdate: number = 0;
  updateInterval: number = 50; // 50ms = 20 updates per second
  
  constructor() {}

  async initialize() {
    // Check if we are in production and use the appropriate server URL
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      // Use production server (deployed WebSocket server)
      this.serverUrl = `wss://${window.location.hostname}:3001`;
    }

    console.log(`Connecting to WebSocket server at ${this.serverUrl}`);
    this.connectSocket();
    
    // Start the game loop for sending position updates
    this.startUpdateLoop();

    // Add window error handler to prevent crashes
    window.addEventListener('error', (event) => {
      console.error('Caught runtime error:', event.error);
      // Prevent the error from crashing the game
      event.preventDefault();
      return true;
    });
  }
  
  connectSocket() {
    try {
      this.socket = new WebSocket(this.serverUrl);
      
      this.socket.onopen = this.handleSocketOpen.bind(this);
      this.socket.onmessage = this.handleSocketMessage.bind(this);
      this.socket.onclose = this.handleSocketClose.bind(this);
      this.socket.onerror = this.handleSocketError.bind(this);
    } catch (error) {
      console.error("Failed to connect to WebSocket server:", error);
      this.handleReconnect();
    }
  }
  
  handleSocketOpen(event: Event) {
    console.log("Connected to WebSocket server");
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Initial registration with the server
    this.sendPlayerInfo();
  }
  
  handleSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case "player_id":
          this.handlePlayerId(data);
          break;
        case "player_joined":
          this.handlePlayerJoined(data);
          break;
        case "player_left":
          this.handlePlayerLeft(data);
          break;
        case "player_list":
          this.handlePlayerList(data);
          break;
        case "player_update":
          this.handlePlayerUpdate(data);
          break;
        case "monster_update":
          this.handleMonsterUpdate(data);
          break;
        case "monster_damage":
          this.handleMonsterDamage(data);
          break;
        case "chat_message":
          this.handleChatMessage(data);
          break;
        case "error":
          console.error("Server error:", data.message);
          break;
        default:
          console.warn("Unknown message type:", data.type);
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
    }
  }
  
  handleSocketClose(event: CloseEvent) {
    console.log("WebSocket connection closed:", event.code, event.reason);
    this.isConnected = false;
    this.handleReconnect();
  }
  
  handleSocketError(event: Event) {
    console.error("WebSocket error:", event);
    this.isConnected = false;
  }
  
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connectSocket();
      }, this.reconnectInterval);
    } else {
      console.error("Max reconnect attempts reached. Please refresh the page.");
    }
  }
  
  sendMessage(message: any) {
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
  
  sendPlayerInfo() {
    if (!MyCharacter || !MyCharacter.stats) return;
    
    // Always convert mapId to number to ensure consistent behavior
    const mapId = Number(MapleMap.id);
    console.log(`Sending player info with mapId=${mapId} (${typeof mapId})`);
    
    const playerInfo: PlayerState = {
      id: this.playerId || "unregistered",
      x: MyCharacter.pos.x,
      y: MyCharacter.pos.y,
      stance: MyCharacter.stance,
      frame: MyCharacter.frame,
      flipped: MyCharacter.flipped,
      name: MyCharacter.name || "Player",
      hair: MyCharacter.hair || 30030,
      face: MyCharacter.face || 20000,
      skin: MyCharacter.skinColor || 0,  // Use skinColor not skin
      mapId: mapId,
      level: MyCharacter.stats.level,
      job: MyCharacter.stats.job,
      hp: MyCharacter.stats.hp,
      maxHp: MyCharacter.stats.maxHp,
      attacking: false
    };
    
    console.log("Sending player info:", playerInfo);
    
    this.sendMessage({
      type: "player_info",
      data: playerInfo
    });
  }
  
  sendPlayerUpdate() {
    if (!this.playerId || !MyCharacter) return;
    
    const currentTime = Date.now();
    if (currentTime - this.lastUpdate < this.updateInterval) return;
    this.lastUpdate = currentTime;
    
    // Always convert mapId to number
    const mapId = Number(MapleMap.id);
    
    const update: PlayerUpdate = {
      x: MyCharacter.pos.x,
      y: MyCharacter.pos.y,
      stance: MyCharacter.stance,
      frame: MyCharacter.frame,
      flipped: MyCharacter.flipped,
      mapId: mapId,
      attacking: MyCharacter.attacking || false
    };
    
    this.sendMessage({
      type: "player_update",
      data: update
    });
  }
  
  sendChatMessage(message: string) {
    if (!this.playerId) return;
    
    // Always convert mapId to number
    const mapId = Number(MapleMap.id);
    
    const chatMessage: ChatMessage = {
      playerId: this.playerId,
      message: message,
      mapId: mapId
    };
    
    this.sendMessage({
      type: "chat_message",
      data: chatMessage
    });
  }
  
  sendMonsterDamage(monsterId: number, damage: number) {
    if (!this.playerId) return;
    
    // Always convert mapId to number
    const mapId = Number(MapleMap.id);
    
    const damageEvent: DamageEvent = {
      sourceId: this.playerId,
      targetId: monsterId,
      damage: damage,
      mapId: mapId
    };
    
    this.sendMessage({
      type: "monster_damage",
      data: damageEvent
    });
  }
  
  handlePlayerId(data: any) {
    this.playerId = data.id;
    console.log(`Assigned player ID: ${this.playerId}`);
    
    // Now that we have an ID, send full player info
    this.sendPlayerInfo();
  }
  
  handlePlayerJoined(data: any) {
    const playerData = data.player;
    
    // Only add players in the same map
    if (playerData.mapId !== MapleMap.id) return;
    
    console.log(`Player joined: ${playerData.name} (${playerData.id})`);
    
    // Create a new MapleCharacter for the player
    this.addOrUpdateOtherPlayer(playerData);
  }
  
  handlePlayerLeft(data: any) {
    const playerId = data.id;
    
    if (this.otherPlayers.has(playerId)) {
      console.log(`Player left: ${playerId}`);
      
      // Remove player from the map
      const player = this.otherPlayers.get(playerId)!;
      const index = MapleMap.characters.indexOf(player);
      if (index !== -1) {
        MapleMap.characters.splice(index, 1);
      }
      
      this.otherPlayers.delete(playerId);
    }
  }
  
  handlePlayerList(data: any) {
    if (!data.players || !Array.isArray(data.players)) {
      console.error("Invalid player list received:", data);
      return;
    }
    
    const playerList = data.players;
    // Convert current map ID to number to ensure consistent comparison
    const currentMapId = Number(MapleMap.id);
    
    console.log(`Received player list with ${playerList.length} players`);
    console.log("Current map ID:", currentMapId, "Type:", typeof currentMapId);
    
    // Display raw player list for debugging
    console.log("All players in list:", playerList);
    
    // First, remove any players that are no longer in the list
    const currentIds = new Set(playerList.map((p: any) => p.id));
    console.log("Current IDs in player list:", [...currentIds]);
    
    for (const [id, player] of this.otherPlayers.entries()) {
      if (!currentIds.has(id) && id !== this.playerId) {
        console.log(`Removing player ${id} as they are no longer in the list`);
        // Remove player from the map
        const index = MapleMap.characters.indexOf(player);
        if (index !== -1) {
          MapleMap.characters.splice(index, 1);
        }
        
        this.otherPlayers.delete(id);
      }
    }
    
    console.log("Current other players:", [...this.otherPlayers.keys()]);
    
    // Then add/update all players from the list
    for (const playerData of playerList) {
      // Skip ourselves
      if (playerData.id === this.playerId) {
        console.log(`Skipping our own player ID: ${playerData.id}`);
        continue;
      }
      
      // Ensure mapId is converted to a number for consistent comparison
      const playerMapId = Number(playerData.mapId);
      
      // Debug - show mapId to see if it's matching
      console.log(`Player ${playerData.id} is in map ${playerMapId} (${typeof playerMapId}), we are in ${currentMapId} (${typeof currentMapId})`);
      
      // Only add players in the same map - use number comparison
      if (playerMapId !== currentMapId) {
        console.log(`Skipping player ${playerData.id} as they are in map ${playerMapId} and we are in ${currentMapId}`);
        continue;
      }
      
      console.log(`Adding/Updating player ${playerData.id} in map ${playerMapId}`);
      this.addOrUpdateOtherPlayer(playerData);
    }
    
    // Debug - show all characters in the map after updates
    console.log(`MapleMap.characters count: ${MapleMap.characters.length}`);
    console.log(`otherPlayers count: ${this.otherPlayers.size}`);
  }
  
  async addOrUpdateOtherPlayer(playerData: PlayerState) {
    const playerId = playerData.id;
    
    // Skip adding our own character
    if (playerId === this.playerId) return;
    
    if (!this.otherPlayers.has(playerId)) {
      // Create a new player character
      try {
        console.log(`Creating new character for player ${playerId}`, playerData);
        
        // Create character with proper initialization options
        const character = new MapleCharacter({
          id: playerId,
          name: playerData.name || "Player",
          hair: playerData.hair || 30030,
          face: playerData.face || 20000,
          skinColor: playerData.skin || 0,  // This is the key fix - providing skinColor
          stance: playerData.stance || "stand1",
          frame: playerData.frame || 0,
          flipped: playerData.flipped || false,
          hp: playerData.hp || 100,
          maxHp: playerData.maxHp || 100,
          stats: new Stats({
            level: playerData.level || 1,
            job: playerData.job || 0,
            str: 4,
            dex: 4,
            int: 4,
            luk: 4,
            maxHp: playerData.maxHp || 100,
            hp: playerData.hp || 100
          }),
          inventory: new Inventory({
            mesos: 0
          })
        });
        
        // Set initial position with no velocity to prevent unwanted movement
        character.pos = new Physics(playerData.x, playerData.y);
        
        // Disable automatic physics updates for other players to prevent jitter
        if (character.pos.update && typeof character.pos.update === 'function') {
          const originalUpdate = character.pos.update;
          character.pos.update = function(msPerTick: number) {
            // Only apply minimal physics for other players
            // This prevents unwanted gravity/physics effects
            if (character.pos.vx !== undefined && character.pos.x !== undefined) {
              character.pos.x += character.pos.vx * msPerTick / 1000;
            }
            if (character.pos.vy !== undefined && character.pos.y !== undefined) {
              character.pos.y += character.pos.vy * msPerTick / 1000;
            }
            
            // Gradually reduce velocity to stop movement
            if (character.pos.vx !== undefined) {
              character.pos.vx *= 0.9;
            }
            if (character.pos.vy !== undefined) {
              character.pos.vy *= 0.9;
            }
            
            // Stop movement completely when velocity is very small
            if (Math.abs(character.pos.vx || 0) < 0.1) character.pos.vx = 0;
            if (Math.abs(character.pos.vy || 0) < 0.1) character.pos.vy = 0;
          };
        }
        
        // Load assets for this character
        await character.load();
        
        // Attach basic equips to make other players look proper
        try {
          if (character.attachEquip && typeof character.attachEquip === 'function') {
            // Pants
            character.attachEquip(5, 1060002);
            // Shirt
            character.attachEquip(4, 1040002);
            // Beginner weapon
            character.attachEquip(10, 1302000);
          }
        } catch (error) {
          console.error("Failed to attach default equipment to player:", error);
        }
        
        // Add to our tracking and to the map
        this.otherPlayers.set(playerId, character);
        MapleMap.characters.push(character);
        
        console.log(`Added player ${character.name} to the map`);
      } catch (error) {
        console.error(`Failed to create character for player ${playerId}:`, error);
      }
    } else {
      // Update existing player
      try {
        const character = this.otherPlayers.get(playerId)!;
        
        // Update position using movement interpolation (handled in handlePlayerUpdate)
        // We don't directly set position here to avoid jumps
        
        // Update appearance and stats
        if (playerData.stance) character.stance = playerData.stance;
        if (playerData.frame !== undefined) character.frame = playerData.frame;
        if (playerData.flipped !== undefined) character.flipped = playerData.flipped;
        
        // Update stats if available and stats exists
        if (character.stats) {
          if (playerData.level) character.stats.level = playerData.level;
          if (playerData.job) character.stats.job = playerData.job;
          if (playerData.hp) character.stats.hp = playerData.hp;
          if (playerData.maxHp) character.stats.maxHp = playerData.maxHp;
        }
      } catch (error) {
        console.error(`Failed to update character for player ${playerId}:`, error);
      }
    }
  }
  
  handlePlayerUpdate(data: any) {
    const playerData = data.player;
    
    // Skip our own updates
    if (playerData.id === this.playerId) return;
    
    // Skip players in other maps
    if (playerData.mapId !== MapleMap.id) return;
    
    const playerId = playerData.id;
    
    if (this.otherPlayers.has(playerId)) {
      const character = this.otherPlayers.get(playerId)!;
      
      try {
        // Use smoother position updates with interpolation
        if (playerData.x !== undefined && playerData.y !== undefined) {
          // Calculate position difference
          const dx = playerData.x - character.pos.x;
          const dy = playerData.y - character.pos.y;
          
          // Only apply direct position changes for significant movements (teleporting)
          const significantMove = Math.abs(dx) > 100 || Math.abs(dy) > 100;
          
          if (significantMove) {
            // Large jump - apply directly
            character.pos.x = playerData.x;
            character.pos.y = playerData.y;
            
            // Reset velocity to prevent unwanted movement
            if (character.pos.vx !== undefined) character.pos.vx = 0;
            if (character.pos.vy !== undefined) character.pos.vy = 0;
          } else {
            // Small movement - smooth using velocity
            // Set target position through velocity over multiple frames
            if (character.pos.vx !== undefined) {
              // Set velocity to reach target in ~3 frames
              character.pos.vx = dx / 3;
            } else {
              // Direct position update if no velocity support
              character.pos.x = playerData.x;
            }
            
            if (character.pos.vy !== undefined) {
              character.pos.vy = dy / 3;
            } else {
              character.pos.y = playerData.y;
            }
            
            // Ensure we're not going too fast
            const maxSpeed = 300; // Maximum speed in pixels per second
            if (character.pos.vx !== undefined) {
              character.pos.vx = Math.max(Math.min(character.pos.vx, maxSpeed), -maxSpeed);
            }
            if (character.pos.vy !== undefined) {
              character.pos.vy = Math.max(Math.min(character.pos.vy, maxSpeed), -maxSpeed);
            }
          }
        }
        
        // Only update other properties if they exist
        if (playerData.stance) character.stance = playerData.stance;
        if (playerData.frame !== undefined) character.frame = playerData.frame;
        if (playerData.flipped !== undefined) character.flipped = playerData.flipped;
        
        // Handle player attacking animation
        if (playerData.attacking) {
          // Implement attack animation for other players
          if (character.attack && typeof character.attack === 'function') {
            try {
              character.attack();
            } catch (error) {
              console.error("Error animating other player attack:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error updating other player:", error);
      }
    } else {
      // If we get an update for a player we don't know, request full player list
      this.sendMessage({ type: "get_player_list" });
    }
  }
  
  handleMonsterUpdate(data: any) {
    const monsterData = data.monster;
    
    // Skip monsters in other maps
    if (monsterData.mapId !== MapleMap.id) return;
    
    // Find the monster in our map
    const monster = MapleMap.monsters.find(m => m.id === monsterData.id);
    
    if (monster) {
      // Update position and state
      monster.pos.x = monsterData.x;
      monster.pos.y = monsterData.y;
      monster.hp = monsterData.hp;
      
      // If the monster was killed, mark it for destruction
      if (monsterData.hp <= 0) {
        monster.destroyed = true;
      }
    }
  }
  
  handleMonsterDamage(data: any) {
    const damageEvent = data.damage;
    
    // Skip events in other maps
    if (damageEvent.mapId !== MapleMap.id) return;
    
    // Find the monster in our map
    const monster = MapleMap.monsters.find(m => m.id === damageEvent.targetId);
    
    if (monster) {
      // Apply damage from other player
      if (damageEvent.sourceId !== this.playerId) {
        monster.hp -= damageEvent.damage;
        
        // Show damage number from other player
        if (monster.DamageIndicator) {
          monster.DamageIndicator.createDamageNumber(damageEvent.damage, false);
        }
        
        // If the monster is killed, mark it for destruction
        if (monster.hp <= 0) {
          monster.destroyed = true;
        }
      }
    }
  }
  
  handleChatMessage(data: any) {
    const chatMessage = data.message;
    
    // Skip messages in other maps
    if (chatMessage.mapId !== MapleMap.id) return;
    
    // Find the player
    if (chatMessage.playerId === this.playerId) {
      // It's our own message, handled directly
      return;
    }
    
    // Show message above other player
    const player = this.otherPlayers.get(chatMessage.playerId);
    if (player) {
      // Show chat balloon above player
      if (window.UIMap && window.UIMap.showPlayerChatBalloon) {
        window.UIMap.showPlayerChatBalloon(chatMessage.message, player);
      }
    }
  }
  
  startUpdateLoop() {
    // Send position updates at regular intervals
    const updateInterval = this.updateInterval;
    
    // Use a longer interval to reduce network traffic - update only 10 times per second
    this.updateInterval = 100; // 100ms = 10 updates per second
    
    // Store previous position to only send updates when something changed
    let lastPosX = 0;
    let lastPosY = 0;
    let lastStance = '';
    let lastFrame = 0;
    let lastFlipped = false;
    
    setInterval(() => {
      try {
        if (!this.isConnected || !this.playerId || !MyCharacter) return;
        
        // Only send updates when the position or state has changed
        const posChanged = (
          Math.abs(MyCharacter.pos.x - lastPosX) > 1 || 
          Math.abs(MyCharacter.pos.y - lastPosY) > 1
        );
        
        const stateChanged = (
          MyCharacter.stance !== lastStance ||
          MyCharacter.frame !== lastFrame ||
          MyCharacter.flipped !== lastFlipped ||
          MyCharacter.attacking
        );
        
        if (posChanged || stateChanged) {
          this.sendPlayerUpdate();
          
          // Update last known position and state
          lastPosX = MyCharacter.pos.x;
          lastPosY = MyCharacter.pos.y;
          lastStance = MyCharacter.stance;
          lastFrame = MyCharacter.frame;
          lastFlipped = MyCharacter.flipped;
        }
      } catch (error) {
        console.error("Error in update loop:", error);
      }
    }, this.updateInterval);
  }
  
  // Helper method to check if a player is in the same map
  isPlayerInSameMap(playerData: any): boolean {
    return playerData.mapId === MapleMap.id;
  }
}

// Declare global type for window with UIMap
declare global {
  interface Window {
    UIMap: any;
  }
}

// Export a singleton instance
export default new MySocket();