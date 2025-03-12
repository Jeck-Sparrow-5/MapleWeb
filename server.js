// WebSocket server for MapleWeb multiplayer
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const express = require('express');
const path = require('path');

// Create an Express app for serving static files
const app = express();
app.use(express.static(path.join(__dirname, 'TypeScript-Client')));

// Create an HTTP server
const server = http.createServer(app);

// Create a WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected players
const players = new Map();

// Store monster state
const monsters = new Map();

// Message handling
wss.on('connection', (ws) => {
  // Set maximum payload size and add connection timeout
  ws.maxPayload = 65536; // 64KB max payload size
  ws.isAlive = true;
  
  const playerId = uuidv4();
  console.log(`New player connected: ${playerId}`);
  
  // Store player connection
  players.set(playerId, {
    id: playerId,
    ws,
    info: null,
    mapId: 0,
    lastUpdate: Date.now(),
    lastBroadcast: 0
  });
  
  // Send player their ID
  sendToPlayer(ws, {
    type: 'player_id',
    id: playerId
  });
  
  // Handle pings to keep connection alive
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  // Handle messages from clients
  ws.on('message', (message) => {
    try {
      // Only process if message is a string or buffer
      if (typeof message === 'string' || Buffer.isBuffer(message)) {
        const messageStr = message.toString();
        
        // Handle empty messages
        if (!messageStr.trim()) {
          return;
        }
        
        const data = JSON.parse(messageStr);
        
        // Rate limit message processing
        const now = Date.now();
        const player = players.get(playerId);
        const messageInterval = 50; // 50ms between messages (20 messages per second max)
        
        if (player && (now - player.lastMessageTime < messageInterval)) {
          // Skip processing if messages are coming too fast
          return;
        }
        
        // Update last message time
        if (player) {
          player.lastMessageTime = now;
        }
        
        // Process the message
        handleMessage(playerId, data);
      }
    } catch (error) {
      console.error(`Error handling message from ${playerId}:`, error);
      // Send error back to client
      sendToPlayer(ws, {
        type: 'error',
        message: 'Failed to process message'
      });
    }
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for player ${playerId}:`, error);
    
    // Clean up on error
    const player = players.get(playerId);
    if (player && player.info) {
      broadcastToMap(player.info.mapId, {
        type: 'player_left',
        id: playerId
      }, playerId);
    }
    
    players.delete(playerId);
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log(`Player disconnected: ${playerId}`);
    
    // Get player info before removing
    const player = players.get(playerId);
    
    // Remove player from list
    players.delete(playerId);
    
    // Notify other players about the disconnect
    if (player && player.info) {
      broadcastToMap(player.info.mapId, {
        type: 'player_left',
        id: playerId
      }, playerId);
    }
  });
});

// Handle incoming messages
function handleMessage(playerId, data) {
  const player = players.get(playerId);
  if (!player) return;
  
  switch (data.type) {
    case 'player_info':
      handlePlayerInfo(playerId, data.data);
      break;
    case 'player_update':
      handlePlayerUpdate(playerId, data.data);
      break;
    case 'monster_damage':
      handleMonsterDamage(playerId, data.data);
      break;
    case 'chat_message':
      handleChatMessage(playerId, data.data);
      break;
    case 'get_player_list':
      sendPlayerList(playerId);
      break;
    default:
      console.warn('Unknown message type:', data.type);
  }
}

// Handle player info update
function handlePlayerInfo(playerId, playerInfo) {
  const player = players.get(playerId);
  if (!player) return;
  
  console.log(`Received player info for ${playerId}:`, playerInfo);
  
  // Always convert mapId to number
  playerInfo.mapId = Number(playerInfo.mapId);
  
  // Update player info
  player.info = {
    ...playerInfo,
    id: playerId
  };
  
  // Store map ID (as number) for filtering broadcasts
  player.mapId = Number(playerInfo.mapId);
  
  console.log(`Player ${playerId} is in map ${player.mapId} (${typeof player.mapId})`);
  console.log(`Total players in system: ${players.size}`);
  
  // Log all players in same map
  console.log(`Players in map ${player.mapId}:`);
  for (const [id, p] of players.entries()) {
    if (Number(p.mapId) === Number(player.mapId)) {
      console.log(`- Player ${id} (${p.info?.name || 'unnamed'})`);
    }
  }
  
  // Notify other players about the new player
  broadcastToMap(player.mapId, {
    type: 'player_joined',
    player: player.info
  }, playerId);
  
  // Send the current player list to the new player
  sendPlayerList(playerId);
  
  // IMPORTANT: Make sure this player also knows about all other players
  // This ensures that if two players connect almost simultaneously, they see each other
  for (const [id, p] of players.entries()) {
    if (id !== playerId && p.info && Number(p.mapId) === Number(player.mapId)) {
      console.log(`Telling player ${playerId} about player ${id}`);
      sendToPlayer(player.ws, {
        type: 'player_joined',
        player: p.info
      });
    }
  }
  
  // Debug - Send player list to everyone to force refresh
  for (const [id, p] of players.entries()) {
    if (Number(p.mapId) === Number(player.mapId)) {
      sendPlayerList(id);
    }
  }
}

// Handle player position and state updates
function handlePlayerUpdate(playerId, updateData) {
  const player = players.get(playerId);
  if (!player || !player.info) return;
  
  try {
    // Validate update data
    if (!updateData || typeof updateData !== 'object') {
      console.warn(`Invalid update data from player ${playerId}`);
      return;
    }
    
    // Ensure required fields exist
    if (updateData.mapId === undefined) {
      updateData.mapId = player.mapId || player.info.mapId;
    }
    
    // Update player info with validation
    const updatedInfo = { ...player.info };
    
    // Update position safely
    if (typeof updateData.x === 'number' && !isNaN(updateData.x)) {
      updatedInfo.x = updateData.x;
    }
    if (typeof updateData.y === 'number' && !isNaN(updateData.y)) {
      updatedInfo.y = updateData.y;
    }
    
    // Update other properties
    if (updateData.stance) updatedInfo.stance = updateData.stance;
    if (updateData.frame !== undefined) updatedInfo.frame = updateData.frame;
    if (updateData.flipped !== undefined) updatedInfo.flipped = updateData.flipped;
    if (updateData.attacking !== undefined) updatedInfo.attacking = updateData.attacking;
    
    // Save updated info
    player.info = updatedInfo;
    
    // Track if player changed maps
    const mapChanged = player.mapId !== updateData.mapId;
    if (mapChanged) {
      // Notify players in old map that player left
      broadcastToMap(player.mapId, {
        type: 'player_left',
        id: playerId
      }, playerId);
      
      // Update player's map
      player.mapId = updateData.mapId;
      
      // Notify players in new map that player joined
      broadcastToMap(player.mapId, {
        type: 'player_joined',
        player: player.info
      }, playerId);
      
      // Send updated player list to the player
      sendPlayerList(playerId);
    } else {
      // Use rate limiting for position updates to reduce network traffic
      const now = Date.now();
      const timeSinceLastBroadcast = now - (player.lastBroadcast || 0);
      const broadcastInterval = 100; // milliseconds
      
      if (timeSinceLastBroadcast >= broadcastInterval) {
        // Broadcast update to other players in the same map
        broadcastToMap(player.mapId, {
          type: 'player_update',
          player: player.info
        }, playerId);
        
        player.lastBroadcast = now;
      }
    }
    
    // Update last update time
    player.lastUpdate = Date.now();
  } catch (error) {
    console.error(`Error handling player update for ${playerId}:`, error);
  }
}

// Handle monster damage
function handleMonsterDamage(playerId, damageData) {
  const player = players.get(playerId);
  if (!player || !player.info) return;
  
  // Get monster state or create new one
  let monster = monsters.get(damageData.targetId);
  if (!monster) {
    // We don't know about this monster yet, create it
    monster = {
      id: damageData.targetId,
      hp: 100, // Default HP, will be overridden by client
      maxHp: 100,
      mapId: damageData.mapId,
      lastUpdate: Date.now()
    };
    monsters.set(damageData.targetId, monster);
  }
  
  // Update monster HP
  monster.hp -= damageData.damage;
  if (monster.hp < 0) monster.hp = 0;
  
  // Broadcast damage event and updated monster state
  broadcastToMap(damageData.mapId, {
    type: 'monster_damage',
    damage: damageData
  }, playerId);
  
  broadcastToMap(damageData.mapId, {
    type: 'monster_update',
    monster: monster
  });
  
  // If monster died, schedule it for cleanup
  if (monster.hp <= 0) {
    setTimeout(() => {
      monsters.delete(damageData.targetId);
    }, 5000);
  }
}

// Handle chat messages
function handleChatMessage(playerId, chatData) {
  const player = players.get(playerId);
  if (!player || !player.info) return;
  
  // Broadcast message to all players in the same map
  broadcastToMap(chatData.mapId, {
    type: 'chat_message',
    message: {
      playerId,
      message: chatData.message,
      mapId: chatData.mapId
    }
  });
}

// Send player list to specific player
function sendPlayerList(playerId) {
  const player = players.get(playerId);
  if (!player || !player.ws) return;
  
  console.log(`Sending player list to ${playerId} in map ${player.mapId}`);
  
  // Collect all players' info
  const playerList = [];
  for (const [id, p] of players.entries()) {
    // Only include players with info
    if (p.info) {
      console.log(`Adding player ${id} to list with mapId=${p.info.mapId}`);
      playerList.push(p.info);
    }
  }
  
  console.log(`Total players in list: ${playerList.length}`);
  
  // Send player list
  sendToPlayer(player.ws, {
    type: 'player_list',
    players: playerList
  });
}

// Send message to a specific player
function sendToPlayer(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message to player:', error);
    }
  }
}

// Broadcast message to all players in a map
function broadcastToMap(mapId, message, excludePlayerId = null) {
  // Convert mapId to number to ensure consistent comparison
  const numericMapId = Number(mapId);
  
  // Log all available players for debugging
  console.log(`Broadcasting to map ${numericMapId}, excluding player ${excludePlayerId}`);
  console.log(`Available players: ${Array.from(players.keys()).join(', ')}`);
  
  for (const [id, player] of players.entries()) {
    // Skip excluded player
    if (id === excludePlayerId) continue;
    
    // Convert player's mapId to number for comparison
    const playerMapId = Number(player.mapId);
    
    console.log(`Checking player ${id} in map ${playerMapId} against target map ${numericMapId}`);
    
    // Only send to players in the same map
    if (playerMapId === numericMapId && player.ws.readyState === WebSocket.OPEN) {
      try {
        console.log(`Broadcasting message to player ${id}`);
        player.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error broadcasting to player ${id}:`, error);
      }
    }
  }
}

// Clean up inactive players
function cleanupInactivePlayers() {
  const now = Date.now();
  const inactiveTimeout = 60000; // 60 seconds
  
  for (const [id, player] of players.entries()) {
    if (now - player.lastUpdate > inactiveTimeout) {
      console.log(`Removing inactive player: ${id}`);
      
      // Notify other players
      if (player.info) {
        broadcastToMap(player.mapId, {
          type: 'player_left',
          id
        });
      }
      
      // Close connection
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.close();
      }
      
      // Remove from list
      players.delete(id);
    }
  }
}

// Start inactive player cleanup task
setInterval(cleanupInactivePlayers, 30000);

// Health check ping - keep connections alive and detect dead clients
const pingInterval = 30000; // 30 seconds
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      // Connection is dead, terminate it
      return ws.terminate();
    }
    
    // Mark as potentially inactive until we get a pong response
    ws.isAlive = false;
    // Send ping
    try {
      ws.ping();
    } catch (error) {
      console.error('Error sending ping:', error);
      ws.terminate();
    }
  });
}, pingInterval);

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server is listening for connections`);
});