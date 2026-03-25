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
  
  // ALWAYS convert mapId to number
  playerInfo.mapId = Number(playerInfo.mapId);
  
  // Update player info
  player.info = {
    ...playerInfo,
    id: playerId
  };
  
  // Store map ID for filtering broadcasts
  player.mapId = playerInfo.mapId;
  
  // Notify other players in the same map about this player
  broadcastToMap(player.mapId, {
    type: 'player_joined',
    player: player.info
  }, playerId);
  
  // Send player list to the new player
  sendPlayerList(playerId);
}

// Handle player position and state updates
function handlePlayerUpdate(playerId, updateData) {
  const player = players.get(playerId);
  if (!player || !player.info) return;
  
  // Ensure mapId is always a number
  if (updateData.mapId !== undefined) {
    updateData.mapId = Number(updateData.mapId);
  } else {
    updateData.mapId = Number(player.mapId || player.info.mapId);
  }
  
  // Update player info
  const updatedInfo = { ...player.info };
  
  // Update position
  if (updateData.x !== undefined) updatedInfo.x = updateData.x;
  if (updateData.y !== undefined) updatedInfo.y = updateData.y;
  
  // Update other properties
  if (updateData.stance) updatedInfo.stance = updateData.stance;
  if (updateData.frame !== undefined) updatedInfo.frame = updateData.frame;
  if (updateData.flipped !== undefined) updatedInfo.flipped = updateData.flipped;
  if (updateData.attacking !== undefined) updatedInfo.attacking = updateData.attacking;
  
  // Check if player changed maps
  const currentMapId = Number(player.mapId);
  const newMapId = updateData.mapId;
  
  if (currentMapId !== newMapId) {
    console.log(`Player ${playerId} changed maps: ${currentMapId} -> ${newMapId}`);
    
    // Notify players in old map that this player left
    broadcastToMap(currentMapId, {
      type: 'player_left',
      id: playerId
    }, playerId);
    
    // Update map ID
    player.mapId = newMapId;
    updatedInfo.mapId = newMapId;
    
    // Notify players in new map about this player
    broadcastToMap(newMapId, {
      type: 'player_joined',
      player: updatedInfo
    }, playerId);
    
    // Send updated player list to this player
    sendPlayerList(playerId);
  } else {
    // Rate limit broadcasts for position updates
    const now = Date.now();
    const timeSinceLastBroadcast = now - (player.lastBroadcast || 0);
    const broadcastInterval = 100; // milliseconds
    
    if (timeSinceLastBroadcast >= broadcastInterval) {
      // Broadcast update to players in same map
      broadcastToMap(player.mapId, {
        type: 'player_update',
        player: updatedInfo
      }, playerId);
      
      player.lastBroadcast = now;
    }
  }
  
  // Save updated info
  player.info = updatedInfo;
  player.lastUpdate = Date.now();
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
  
  // Get player's current map ID
  const playerMapId = Number(player.mapId);
  
  // Filter players in the same map
  const playerList = [];
  for (const [id, p] of players.entries()) {
    if (p.info && Number(p.mapId) === playerMapId) {
      playerList.push(p.info);
    }
  }
  
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
// Key changes to fix in server.js

// 1. Fix the broadcastToMap function
function broadcastToMap(mapId, message, excludePlayerId = null) {
  // IMPORTANT: Convert mapId to number to ensure consistent comparison
  const numericMapId = Number(mapId);
  
  for (const [id, player] of players.entries()) {
    // Skip excluded player
    if (id === excludePlayerId) continue;
    
    // Get the player's current map ID and convert to number
    let playerMapId = player.mapId;
    if (player.info && player.info.mapId) {
      playerMapId = player.info.mapId;
    }
    
    // CRITICAL: Compare as numbers, not strings
    const playerMapIdNumeric = Number(playerMapId);
    
    // Only send to players in the same map
    if (playerMapIdNumeric === numericMapId && player.ws.readyState === WebSocket.OPEN) {
      try {
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