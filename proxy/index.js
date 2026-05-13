const WebSocket = require('ws');
const net = require('net');

const WS_PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8089;
const TCP_HOST = process.env.TCP_HOST || '127.0.0.1';
const TCP_PORT = process.env.TCP_PORT ? parseInt(process.env.TCP_PORT) : 8484;

const wss = new WebSocket.Server({ host: '127.0.0.1', port: WS_PORT });

wss.on('connection', (ws) => {
  const tcp = net.createConnection({ host: TCP_HOST, port: TCP_PORT });

  tcp.on('connect', () => {
    console.log(`TCP connected to ${TCP_HOST}:${TCP_PORT}`);
  });

  tcp.on('data', (data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });

  tcp.on('close', () => {
    ws.close();
  });

  tcp.on('error', (err) => {
    console.error('TCP error:', err.message);
    ws.close();
  });

  ws.on('message', (data) => {
    if (tcp.writable) {
      tcp.write(data);
    }
  });

  ws.on('close', () => {
    tcp.destroy();
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
    tcp.destroy();
  });
});

wss.on('listening', () => {
  console.log(`Proxy ready: ws://127.0.0.1:${WS_PORT} -> tcp://${TCP_HOST}:${TCP_PORT}`);
});

wss.on('error', (err) => {
  console.error('Server error:', err.message);
  process.exit(1);
});
