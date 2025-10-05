# Prio Backend

WebSocket proxy server for Speechmatics STT API.

## Purpose

This server acts as a secure proxy between the Prio frontend and Speechmatics API:
- Keeps API keys server-side (never exposed in frontend)
- Handles WebSocket connections
- Forwards audio streams to Speechmatics
- Returns transcriptions to client

## Environment Variables

Required:
- `SPEECHMATICS_API_KEY` - Your Speechmatics API key
- `PORT` - Server port (default: 10000)

## Deployment on Render

1. Create new Web Service
2. Point to this repo, root directory: `server`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Add environment variable: `SPEECHMATICS_API_KEY`

## Local Development

```bash
cd server
npm install
SPEECHMATICS_API_KEY=your_key PORT=10000 node index.js
```

## Endpoints

- `GET /health` - Health check
- `WebSocket /` - Main WebSocket endpoint for STT
