import WebSocket, { WebSocketServer } from 'ws';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

const app = express();
const PORT = process.env.PORT || 10000;
const SPEECHMATICS_API_KEY = process.env.SPEECHMATICS_API_KEY;
const SPEECHMATICS_WS_URL = 'wss://eu2.rt.speechmatics.com/v2';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'westeurope';

// Validate environment variables but don't crash immediately
const missingEnvVars = [];
if (!SPEECHMATICS_API_KEY) missingEnvVars.push('SPEECHMATICS_API_KEY');
if (!ANTHROPIC_API_KEY) missingEnvVars.push('ANTHROPIC_API_KEY');
if (!AZURE_SPEECH_KEY) missingEnvVars.push('AZURE_SPEECH_KEY');

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('⚠️  Server will start but some features will be unavailable');
}

// Initialize Claude client (server-side - SÄKERT!)
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'prio-backend' }));

// Endpoint för Claude chat
app.post('/api/claude-chat', async (req, res) => {
  try {
    // Check if API key is available
    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'Claude API not configured' });
    }

    console.log('Claude chat request received');
    console.log('Body type:', typeof req.body);
    console.log('Body keys:', Object.keys(req.body || {}));
    console.log('Body:', JSON.stringify(req.body || {}).substring(0, 500));

    const { messages, system, tools, max_tokens = 2000 } = req.body || {};

    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid request: messages not array');
      console.error('messages value:', messages);
      return res.status(400).json({
        error: 'Messages array required',
        debug: {
          receivedBody: req.body,
          messagesType: typeof messages
        }
      });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens,
      system: system || '',
      messages,
      tools: tools || [],
    });

    res.json(response);
  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({
      error: error.message || 'Failed to communicate with Claude'
    });
  }
});

// Endpoint för Azure TTS
app.post('/api/azure-tts', async (req, res) => {
  try {
    // Check if Azure API key is available
    if (!AZURE_SPEECH_KEY) {
      return res.status(503).json({ error: 'Azure Speech API not configured' });
    }

    console.log('Azure TTS request received');
    const { text, voice = 'sv-SE-SofieNeural', format = 'audio-16khz-32kbitrate-mono-mp3' } = req.body || {};

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text string required' });
    }

    // Create speech config
    const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
    speechConfig.speechSynthesisVoiceName = voice;

    // Map format string to SDK format
    const formatMap = {
      'audio-16khz-32kbitrate-mono-mp3': sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3,
      'audio-24khz-48kbitrate-mono-mp3': sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3,
      'raw-16khz-16bit-mono-pcm': sdk.SpeechSynthesisOutputFormat.Raw16Khz16BitMonoPcm,
    };
    speechConfig.speechSynthesisOutputFormat = formatMap[format] || formatMap['audio-16khz-32kbitrate-mono-mp3'];

    // Use pull stream to get audio data
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    const result = await new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        result => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve(result);
          } else {
            reject(new Error(`TTS failed: ${result.errorDetails}`));
          }
          synthesizer.close();
        },
        error => {
          synthesizer.close();
          reject(error);
        }
      );
    });

    // Send audio data as base64
    const audioData = Buffer.from(result.audioData).toString('base64');

    res.json({
      success: true,
      audioData,
      format,
      voice,
    });
  } catch (error) {
    console.error('Azure TTS error:', error);
    res.status(500).json({
      error: error.message || 'Failed to synthesize speech'
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`✅ Prio Backend running on port ${PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (clientWs) => {
  console.log('👤 Client connected');

  let speechmaticsWs = null;
  let speechmaticsConnected = false;

  try {
    // Connect to Speechmatics with Authorization header
    speechmaticsWs = new WebSocket(SPEECHMATICS_WS_URL, {
      headers: {
        'Authorization': `Bearer ${SPEECHMATICS_API_KEY}`
      }
    });

    speechmaticsWs.on('open', () => {
      console.log('✅ Connected to Speechmatics API');
      speechmaticsConnected = true;

      // Automatically send StartRecognition when connected
      const startMessage = {
        message: 'StartRecognition',
        audio_format: {
          type: 'raw',
          encoding: 'pcm_s16le',
          sample_rate: 16000
        },
        transcription_config: {
          language: 'sv',
          enable_partials: true,
          max_delay: 5, // Längre fördröjning så hela meningar hinner sägas
          max_delay_mode: 'flexible', // Flexibel så den väntar på naturliga pauser
          operating_point: 'enhanced',
          punctuation_overrides: {
            permitted_marks: ['.', ',', '?', '!', ':', ';'],
            sensitivity: 0.5
          }
        }
      };

      speechmaticsWs.send(JSON.stringify(startMessage));
      console.log('📝 StartRecognition sent for Swedish');
    });

    speechmaticsWs.on('message', (data) => {
      // Log messages for debugging
      try {
        const parsed = JSON.parse(data);
        console.log('📨 Speechmatics:', parsed.message);
      } catch (err) {
        // Binary data
      }

      if (clientWs.readyState === WebSocket.OPEN) {
        // Convert Buffer to string before sending to browser
        const message = typeof data === 'string' ? data : data.toString('utf8');
        clientWs.send(message);
      }
    });

    speechmaticsWs.on('error', (error) => {
      console.error('❌ Speechmatics error:', error.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          message: 'Error',
          type: 'speechmatics_connection',
          reason: error.message
        }));
      }
    });

    speechmaticsWs.on('close', (code, reason) => {
      console.log(`🔌 Speechmatics closed: ${code} ${reason}`);
      speechmaticsConnected = false;
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1000, 'Speechmatics connection closed');
      }
    });

    // Forward audio data from client to Speechmatics
    clientWs.on('message', (data) => {
      if (speechmaticsConnected && speechmaticsWs.readyState === WebSocket.OPEN) {
        speechmaticsWs.send(data);
      }
    });

    clientWs.on('close', () => {
      console.log('👤 Client disconnected');
      if (speechmaticsConnected && speechmaticsWs.readyState === WebSocket.OPEN) {
        speechmaticsWs.send(JSON.stringify({
          message: 'EndOfStream',
          last_seq_no: 0
        }));
        speechmaticsWs.close(1000, 'Client disconnected');
      }
    });

    clientWs.on('error', (error) => {
      console.error('❌ Client error:', error.message);
    });

  } catch (error) {
    console.error('❌ Connection error:', error.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1011, 'Internal server error');
    }
  }
});

// WebSocket error handler for Speechmatics check
wss.on('connection', (ws) => {
  if (!SPEECHMATICS_API_KEY) {
    console.error('⚠️  Speechmatics connection attempted but API key missing');
    ws.close(1008, 'Speechmatics API not configured');
  }
});

// Graceful shutdown handler
const shutdown = (signal) => {
  console.log(`\n${signal} received. Closing server gracefully...`);

  server.close(() => {
    console.log('✅ HTTP server closed');
  });

  wss.close(() => {
    console.log('✅ WebSocket server closed');
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  // Don't exit - let the server continue running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
  // Don't exit - let the server continue running
});

console.log('✅ Server initialized with graceful shutdown handlers');
