const streamUrl = process.env.STREAM_URL ?? 'ws://127.0.0.1:4010/ws';
const symbols = (process.env.STREAM_SYMBOLS ?? 'AAPL,MSFT')
  .split(',')
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean);

const socket = new WebSocket(streamUrl);

socket.addEventListener('open', () => {
  console.log(`[client] connected to ${streamUrl}`);
  socket.send(
    JSON.stringify({
      type: 'subscribe',
      symbols
    })
  );
});

socket.addEventListener('message', (event) => {
  console.log(`[client] ${event.data}`);
});

socket.addEventListener('close', () => {
  console.log('[client] disconnected');
});

setInterval(() => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
  }
}, 10_000);
