// Socket.io client for multiplayer functionality
import MapleMap from "./MapleMap";
import MyCharacter from "./MyCharacter";
import MapleCharacter from "./MapleCharacter";
import { Physics } from "./Physics";
import Monster from "./Monster";
import Inventory from "./Inventory/Inventory";
import Stats from "./Stats/Stats";
import { JobsMainType } from "./Constants/Jobs";

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
  connectionStatusElement: HTMLElement | null = null;
  
  constructor() {}

  async initialize() {
    console.log("Initializing WebSocket connection...");
    
    // Create a connection status indicator
    this.createConnectionStatusIndicator();
    
    // Check if we are in production and use the appropriate server URL
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      // Use production server (deployed WebSocket server)
      // Fix: Use the same hostname but different port
      this.serverUrl = `ws://${window.location.hostname}:3001`;
      
      // If the site is served over HTTPS, WebSocket should use WSS
      if (window.location.protocol === 'https:') {
        this.serverUrl = `wss://${window.location.hostname}:3001`;
      }
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
  
  createConnectionStatusIndicator() {
    // Create a status element to show connection state
    this.connectionStatusElement = document.createElement('div');
    this.connectionStatusElement.style.position = 'fixed';
    this.connectionStatusElement.style.bottom = '10px';
    this.connectionStatusElement.style.right = '10px';
    this.connectionStatusElement.style.padding = '5px 10px';
    this.connectionStatusElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.connectionStatusElement.style.color = '#fff';
    this.connectionStatusElement.style.fontFamily = 'Arial, sans-serif';
    this.connectionStatusElement.style.fontSize = '14px';
    this.connectionStatusElement.style.borderRadius = '5px';
    this.connectionStatusElement.style.zIndex = '9999';
    this.connectionStatusElement.innerText = 'Connecting...';
    
    document.body.appendChild(this.connectionStatusElement);
    this.updateConnectionStatus('connecting');
  }
  
  updateConnectionStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error') {
    if (!this.connectionStatusElement) return;
    
    switch (status) {
      case 'connecting':
        this.connectionStatusElement.innerText = '🔄 Connecting...';
        this.connectionStatusElement.style.backgroundColor = 'rgba(255, 165, 0, 0.7)'; // Orange
        break;
      case 'connected':
        this.connectionStatusElement.innerText = '🟢 Connected';
        this.connectionStatusElement.style.backgroundColor = 'rgba(0, 128, 0, 0.7)'; // Green
        // Make it fade out after 5 seconds
        setTimeout(() => {
          if (this.connectionStatusElement) {
            this.connectionStatusElement.style.opacity = '0.5';
          }
        }, 5000);
        break;
      case 'disconnected':
        this.connectionStatusElement.innerText = '🔴 Disconnected';
        this.connectionStatusElement.style.backgroundColor = 'rgba(255, 0, 0, 0.7)'; // Red
        this.connectionStatusElement.style.opacity = '1';
        break;
      case 'error':
        this.connectionStatusElement.innerText = '⚠️ Connection Error';
        this.connectionStatusElement.style.backgroundColor = 'rgba(255, 0, 0, 0.7)'; // Red
        this.connectionStatusElement.style.opacity = '1';
        break;
    }
  }
  
  connectSocket() {
    try {
      this.updateConnectionStatus('connecting');
      
      // Close any existing connection first
      if (this.socket) {
        this.socket.close();
      }
      
      this.socket = new WebSocket(this.serverUrl);
      
      this.socket.onopen = this.handleSocketOpen.bind(this);
      this.socket.onmessage = this.handleSocketMessage.bind(this);
      this.socket.onclose = this.handleSocketClose.bind(this);
      this.socket.onerror = this.handleSocketError.bind(this);
    } catch (error) {
      console.error("Failed to connect to WebSocket server:", error);
      this.updateConnectionStatus('error');
      this.handleReconnect();
    }
  }
  
  handleSocketOpen(event: Event) {
    console.log("Connected to WebSocket server");
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.updateConnectionStatus('connected');
    
    // Initial registration with the server
    this.sendPlayerInfo();
    
    // Also request the current player list
    this.sendMessage({
      type: "get_player_list"
    });
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
    this.updateConnectionStatus('disconnected');
    this.handleReconnect();
  }
  
  handleSocketError(event: Event) {
    console.error("WebSocket error:", event);
    this.isConnected = false;
    this.updateConnectionStatus('error');
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
      if (this.connectionStatusElement) {
        this.connectionStatusElement.innerText = '❌ Connection failed - Please refresh';
      }
    }
  }
  
  sendMessage(message: any) {
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error("Error sending message:", error);
      }
    } else {
      console.warn("Cannot send message: WebSocket not connected");
    }
  }
  
  sendPlayerInfo() {
    if (!MyCharacter || !MyCharacter.stats) {
      console.warn("Cannot send player info: MyCharacter not initialized");
      return;
    }
    
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
      skin: MyCharacter.skinColor || 0,
      mapId: mapId,
      level: MyCharacter.stats.level,
      job: MyCharacter.job || JobsMainType.Beginner,
      hp: MyCharacter.hp,
      maxHp: MyCharacter.maxHp,
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
      attacking: MyCharacter.isInAttack || false,
      onGround: !!MyCharacter.pos.fh, // Add this to indicate if player is on ground
      // Add more physics state if needed
      vx: MyCharacter.pos.vx,
      vy: MyCharacter.pos.vy
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
    
    // Ensure mapId is a number for consistent comparison
    const playerMapId = Number(playerData.mapId);
    const currentMapId = Number(MapleMap.id);
    
    // Only add players in the same map
    if (playerMapId !== currentMapId) {
      console.log(`Ignoring player ${playerData.id} because they are in map ${playerMapId} and we are in ${currentMapId}`);
      return;
    }
    
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
    console.log("Current map ID:", currentMapId);
    
    // First, remove any players that are no longer in the list
    const currentIds = new Set(playerList.map((p: any) => p.id));
    
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
    
    // Then add/update all players from the list
    for (const playerData of playerList) {
      // Skip ourselves
      if (playerData.id === this.playerId) {
        continue;
      }
      
      // Ensure mapId is converted to a number for consistent comparison
      const playerMapId = Number(playerData.mapId);
      
      // Only add players in the same map
      if (playerMapId !== currentMapId) {
        continue;
      }
      
      this.addOrUpdateOtherPlayer(playerData);
    }
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
          skinColor: playerData.skin || 0,  // Use skin as skinColor
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
        // assign map to character
        character.map = MapleMap;
        // Set initial position
        character.pos = new Physics(playerData.x, playerData.y);

        
        
        // Override physics update to make movement smoother
        const originalUpdate = character.pos.update;
        character.pos.update = function(msPerTick: number) {
          // Simple physics that prioritizes visual smoothness over accuracy
          
          // Apply position changes based on velocity
          this.x += this.vx * (msPerTick / 1000);
          this.y += this.vy * (msPerTick / 1000);
          
          // Gradually reduce velocity (damping)
          this.vx *= 0.9;
          this.vy *= 0.9;
          
          // Stop completely if velocity is very small
          if (Math.abs(this.vx) < 0.1) this.vx = 0;
          if (Math.abs(this.vy) < 0.1) this.vy = 0;
        };
        
        // Load assets for this character
        await character.load();
        
        // Attach basic equips
        try {
          // Pants
          await character.attachEquip(5, 1060002);
          // Shirt
          await character.attachEquip(4, 1040002);
          // Beginner weapon
          await character.attachEquip(10, 1302000);
        } catch (error) {
          console.error("Failed to attach equipment to player:", error);
        }
        
        // Add to tracking
        this.otherPlayers.set(playerId, character);
        
        // Add to map characters
        MapleMap.characters.push(character);
        
        console.log(`Added player ${character.name} to the map`);
      } catch (error) {
        console.error(`Failed to create character for player ${playerId}:`, error);
      }
    } else {
      // Update existing player
      try {
        const character = this.otherPlayers.get(playerId)!;
        
        // Calculate movement vector for smooth interpolation
        const dx = playerData.x - character.pos.x;
        const dy = playerData.y - character.pos.y;
        
        // For large position changes (teleporting), update directly
        const isLargeMovement = Math.abs(dx) > 100 || Math.abs(dy) > 100;
        
        if (isLargeMovement) {
          character.pos.x = playerData.x;
          character.pos.y = playerData.y;
          character.pos.vx = 0;
          character.pos.vy = 0;
        } else {
          // Set velocity for smooth movement (reach target in about 3-5 frames)
          character.pos.vx = dx * 0.3;
          character.pos.vy = dy * 0.3;
          
          // Cap maximum velocity
          const maxSpeed = 300;
          character.pos.vx = Math.max(Math.min(character.pos.vx, maxSpeed), -maxSpeed);
          character.pos.vy = Math.max(Math.min(character.pos.vy, maxSpeed), -maxSpeed);
        }
        
        // Update appearance and animation state
        if (playerData.stance) character.stance = playerData.stance;
        if (playerData.frame !== undefined) character.frame = playerData.frame;
        if (playerData.flipped !== undefined) character.flipped = playerData.flipped;
        
        // Handle attacking state
        if (playerData.attacking && !character.isInAttack) {
          // Trigger attack animation
          if (character.attack && typeof character.attack === 'function') {
            try {
              character.attack();
            } catch (error) {
              console.error("Error animating attack:", error);
            }
          }
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
    const playerMapId = Number(playerData.mapId);
    const currentMapId = Number(MapleMap.id);
    
    if (playerMapId !== currentMapId) return;
    
    const playerId = playerData.id;
    
    if (this.otherPlayers.has(playerId)) {
      const character = this.otherPlayers.get(playerId)!;
      
      // Update position with smoother interpolation
      if (playerData.x !== undefined && playerData.y !== undefined) {
        // Calculate position difference
        const dx = playerData.x - character.pos.x;
        const dy = playerData.y - character.pos.y;
        
        // Handle large position changes (teleporting)
        if (Math.abs(dx) > 100 || Math.abs(dy) > 100) {
          character.pos.x = playerData.x;
          character.pos.y = playerData.y;
          character.pos.vx = 0;
          character.pos.vy = 0;
        } else {
          // Set velocity for smoother movement
          character.pos.vx = dx * 0.3;
          character.pos.vy = dy * 0.3;
        }
      }
      
      // Important: Properly update stance and animation state
      if (playerData.stance) {
        character.setStance(playerData.stance, playerData.frame || 0);
      }
      
      // Update flipped state (facing direction)
      if (playerData.flipped !== undefined) {
        character.flipped = playerData.flipped;
      }
      
      // Handle foothold (ground) state
      // This is crucial for fixing the "stuck in air" issue
      if (playerData.onGround) {
        // Set a foothold if player is on ground
        if (!character.pos.fh) {
          // Create a basic foothold if needed
          character.pos.fh = { id: 1, x1: 0, x2: 1000, y1: character.pos.y, y2: character.pos.y };
        }
      } else {
        // Clear foothold if player is in air
        character.pos.fh = null;
      }
    }
  }
  
  handleMonsterUpdate(data: any) {
    const monsterData = data.monster;
    
    // Skip monsters in other maps
    if (Number(monsterData.mapId) !== Number(MapleMap.id)) return;
    
    // Find the monster in our map
    const monster = MapleMap.monsters.find(m => m.id === monsterData.id);
    
    if (monster) {
      // Update position and state
      monster.pos.x = monsterData.x;
      monster.pos.y = monsterData.y;
      monster.hp = monsterData.hp;
      
      // If the monster was killed, mark it for destruction
      if (monsterData.hp <= 0) {
        monster.dying = true;
        setTimeout(() => {
          monster.destroyed = true;
        }, 1000);
      }
    }
  }
  
  handleMonsterDamage(data: any) {
    const damageEvent = data.damage;
    
    // Skip events in other maps
    if (Number(damageEvent.mapId) !== Number(MapleMap.id)) return;
    
    // Find the monster in our map
    const monster = MapleMap.monsters.find(m => m.id === damageEvent.targetId);
    
    if (monster) {
      // Apply damage from other player
      if (damageEvent.sourceId !== this.playerId) {
        // Apply the damage
        monster.hit(damageEvent.damage, 1, null);
      }
    }
  }
  
  handleChatMessage(data: any) {
    const chatMessage = data.message;
    
    // Skip messages in other maps
    if (Number(chatMessage.mapId) !== Number(MapleMap.id)) return;
    
    // Find the player
    if (chatMessage.playerId === this.playerId) {
      // It's our own message, handled directly
      return;
    }
    
    // Display chat message above other player
    const player = this.otherPlayers.get(chatMessage.playerId);
    if (player) {
      try {
        // Show chat balloon
        player.chatMessage = chatMessage.message;
        player.showChatBalloon = true;
        
        // Hide after 5 seconds
        player.chatBalloonTimer = Date.now();
        player.chatBalloonDuration = 5000;
        
        setTimeout(() => {
          player.showChatBalloon = false;
        }, 5000);
      } catch (error) {
        console.error("Error displaying chat message:", error);
      }
    }
  }
  
  startUpdateLoop() {
    // Send position updates at regular intervals
    const updateInterval = 100; // 100ms = 10 updates per second
    
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
          MyCharacter.isInAttack
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
    }, updateInterval);
  }
}

// Export a singleton instance
export default new MySocket();