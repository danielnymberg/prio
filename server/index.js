const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;
const SPEECHMATICS_API_KEY = process.env.SPEECHMATICS_API_KEY;

if (!SPEECHMATICS_API_KEY) {
  console.error('ERROR: SPEECHMATICS_API_KEY environment variable not set!');
  process.exit(1);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'prio-backend' });
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (clientWs) => {
  console.log('Client connected');

  // Connect to Speechmatics
  const speechmaticsWs = new WebSocket('wss://eu2.rt.speechmatics.com/v2');

  speechmaticsWs.on('open', () => {
    console.log('Connected to Speechmatics');

    // Forward client's initial message (StartRecognition) but inject our API key
    clientWs.on('message', (data) => {
      try {
        const message = JSON.parse(data);

        // If it's StartRecognition, inject the server's API key
        if (message.message === 'StartRecognition') {
          message.auth_token = SPEECHMATICS_API_KEY;
          console.log('Starting recognition with server API key');
        }

        // Forward to Speechmatics
        speechmaticsWs.send(JSON.stringify(message));
      } catch (err) {
        // Not JSON, forward as-is (audio data)
        speechmaticsWs.send(data);
      }
    });
  });

  // Forward Speechmatics responses to client
  speechmaticsWs.on('message', (data) => {
    clientWs.send(data);
  });

  // Handle errors
  speechmaticsWs.on('error', (error) => {
    console.error('Speechmatics error:', error);
    clientWs.send(JSON.stringify({
      message: 'Error',
      reason: 'Speechmatics connection error'
    }));
  });

  speechmaticsWs.on('close', () => {
    console.log('Speechmatics connection closed');
    clientWs.close();
  });

  // Handle client disconnect
  clientWs.on('close', () => {
    console.log('Client disconnected');
    if (speechmaticsWs.readyState === WebSocket.OPEN) {
      speechmaticsWs.send(JSON.stringify({ message: 'EndOfStream' }));
      speechmaticsWs.close();
    }
  });

  clientWs.on('error', (error) => {
    console.error('Client error:', error);
    if (speechmaticsWs.readyState === WebSocket.OPEN) {
      speechmaticsWs.close();
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Prio Backend running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});
