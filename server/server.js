import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app.js';
import { initWebSocket } from './src/config/websocket.js';

const PORT = process.env.PORT || 5001;

const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Change Management Server running on port ${PORT}`);
});

