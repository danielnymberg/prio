import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });
import WebSocket, { WebSocketServer } from 'ws';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import Anthropic from '@anthropic-ai/sdk';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { Redis } from '@upstash/redis';

const app = express();

// Initialize Sentry for error tracking (optional)
// Sentry v10+ auto-instruments Express - no need for Handlers
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration({ app }),
    ],
  });
  console.log('✅ Sentry error tracking enabled');
} else {
  console.log('⚠️  Sentry not configured - error tracking disabled');
}
const PORT = process.env.PORT || 10000;
const SPEECHMATICS_API_KEY = process.env.SPEECHMATICS_API_KEY;
const SPEECHMATICS_WS_URL = 'wss://eu2.rt.speechmatics.com/v2';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'westeurope';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

// Initialize Supabase client with service role (bypass RLS)
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('✅ Supabase client initialized for email-to-task');
} else {
  console.warn('⚠️  Supabase not configured - email-to-task will not work');
}

// Initialize Redis client for conversation history persistence
let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.log('✅ Redis client initialized for conversation history');
} else {
  console.warn('⚠️  Redis not configured - conversation history will not persist');
}

// CORS - Endast tillåtna origins
const allowedOrigins = [
  'https://minprio.se',
  'https://www.minprio.se',
  'https://prio-mr9r.onrender.com', // Render frontend
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        "https://egmrvvguimqwkosrtcau.supabase.co",
        "https://api.anthropic.com",
        "wss://eu2.rt.speechmatics.com"
      ],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    // Tillåt requests utan origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '100mb' })); // Öka för stora PDFs
app.use(express.urlencoded({ extended: true, limit: '100mb' })); // För SendGrid inbound parse
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - Missing token' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');

    if (!supabase) {
      return res.status(503).json({ error: 'Authentication service unavailable' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.warn('Authentication failed:', error?.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Rate limiting
const rateLimit = {};
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 100;

const rateLimiter = (req, res, next) => {
  const userId = req.user?.id || req.ip;
  const now = Date.now();

  if (!rateLimit[userId]) {
    rateLimit[userId] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
    return next();
  }

  if (now > rateLimit[userId].resetTime) {
    rateLimit[userId] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
    return next();
  }

  if (rateLimit[userId].count >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Too many requests',
      resetTime: new Date(rateLimit[userId].resetTime).toISOString()
    });
  }

  rateLimit[userId].count++;
  next();
};

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'prio-backend' }));

// Webhook endpoint för inkommande mejl (från SendGrid/Mailgun)
app.post('/api/email-webhook', async (req, res) => {
  try {
    console.log('📧 Email webhook received');

    // STEG 1: Validera SendGrid HMAC signature
    const SENDGRID_WEBHOOK_SECRET = process.env.SENDGRID_WEBHOOK_SECRET;

    if (SENDGRID_WEBHOOK_SECRET) {
      const signature = req.headers['x-twilio-email-event-webhook-signature'];
      const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'];

      if (signature && timestamp) {
        const crypto = require('crypto');
        const payload = timestamp + JSON.stringify(req.body);
        const expectedSignature = crypto
          .createHmac('sha256', SENDGRID_WEBHOOK_SECRET)
          .update(payload)
          .digest('base64');

        if (signature !== expectedSignature) {
          console.warn('⚠️ Invalid HMAC signature from SendGrid');
          return res.status(403).json({ error: 'Invalid signature' });
        }
      } else {
        console.warn('⚠️ Missing HMAC signature headers');
        return res.status(403).json({ error: 'Missing signature headers' });
      }
    } else {
      console.warn('⚠️ SENDGRID_WEBHOOK_SECRET not configured - HMAC validation disabled');
    }

    // STEG 2: Validera avsändare (exakt match)
    const fromEmail = req.body.from || req.body.sender || '';
    const allowedSender = 'daniel@nymberg.se';

    if (fromEmail.toLowerCase() !== allowedSender) {
      console.warn(`⚠️ Rejected email from unauthorized sender: ${fromEmail}`);
      return res.status(403).json({
        error: 'Unauthorized sender',
        message: 'Only emails from daniel@nymberg.se are accepted'
      });
    }

    // Extrahera mejldata (stödjer både SendGrid och Mailgun format)
    const subject = req.body.subject || '(Inget ämne)';
    const text = req.body.text || req.body['body-plain'] || '';
    const html = req.body.html || req.body['body-html'] || '';
    const emailBody = text || html.replace(/<[^>]*>/g, ''); // Strip HTML tags if no plain text

    console.log(`📧 From: ${fromEmail}`);
    console.log(`📧 Subject: ${subject}`);
    console.log(`📧 Body preview: ${emailBody.substring(0, 100)}...`);

    // Anropa Claude för att tolka mejlet
    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'Claude API not configured' });
    }

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `Du är en AI-assistent som tolkar mejl och extraherar uppgifter för Prio-appen.

Analysera mejlet och extrahera:
1. **title**: En kort uppgiftstitel (max 60 tecken)
2. **description**: Fullständig beskrivning av uppgiften
3. **deadline**: Om mejlet nämner en deadline, returnera i ISO-format (YYYY-MM-DD eller YYYY-MM-DDTHH:MM:SS). Annars null.
4. **priority**: Uppskatta prioritet 1-10 baserat på mejlets ton och innehåll
5. **estimated_duration**: Uppskatta hur lång tid uppgiften tar i minuter

Svara ENDAST med valid JSON i detta format:
{
  "title": "...",
  "description": "...",
  "deadline": "2025-10-15T14:00:00" eller null,
  "priority": 7,
  "estimated_duration": 30
}`,
      messages: [{
        role: 'user',
        content: `Ämne: ${subject}\n\nMeddelande:\n${emailBody}`
      }]
    });

    // Extrahera JSON från Claude's svar
    const responseText = claudeResponse.content[0].text;
    console.log('🤖 Claude response:', responseText);

    let taskData;
    try {
      // Försök hitta JSON i svaret (kan vara inramat av ```json)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        taskData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in Claude response');
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      taskData = {
        title: subject.substring(0, 60),
        description: emailBody,
        deadline: null,
        priority: 5,
        estimated_duration: 30
      };
    }

    // Spara till Supabase email_tasks tabell
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase not configured' });
    }

    // Hämta user_id från email (daniel@nymberg.se → daniel's user_id)
    // VIKTIGT: Du måste manuellt sätta din user_id här eller hämta från Supabase
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', fromEmail.toLowerCase())
      .single();

    if (userError || !users) {
      console.error('Failed to find user:', userError);
      return res.status(404).json({
        error: 'User not found',
        message: `No user found with email ${fromEmail}`
      });
    }

    const userId = users.id;

    // TEMPORÄR variabel för booking data (sparas senare om den hittas)
    let tempBookingData = null;

    // Spara email task (booking_data läggs till senare om detekterat)
    const { data: emailTask, error: insertError } = await supabase
      .from('email_tasks')
      .insert({
        user_id: userId,
        from_email: fromEmail,
        subject: subject,
        body: emailBody,
        task_data: taskData,
        processed: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save email task:', insertError);
      return res.status(500).json({
        error: 'Failed to save email task',
        details: insertError.message
      });
    }

    console.log('✅ Email task saved to database:', emailTask.id);

    // NYTT: Detektera bokningar och skapa kalenderhändelse automatiskt
    const isBooking = subject.toLowerCase().includes('bokning') ||
                      subject.toLowerCase().includes('bekräftelse') ||
                      subject.toLowerCase().includes('confirmation') ||
                      emailBody.toLowerCase().includes('flight') ||
                      emailBody.toLowerCase().includes('flyg') ||
                      emailBody.toLowerCase().includes('tåg') ||
                      emailBody.toLowerCase().includes('sj.se') ||
                      emailBody.toLowerCase().includes('sas.se');

    if (isBooking) {
      console.log('📅 Booking detected, extracting details...');

      try {
        // Extrahera bokningsdetaljer med Claude
        const bookingExtraction = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `Du är en AI som extraherar bokningsdetaljer från mejl.

Analysera mejlet och extrahera:
1. **title**: Kort beskrivning av bokningen (t.ex. "SAS SK1432 Stockholm-Göteborg")
2. **departure_time**: Avgångstid i ISO format (YYYY-MM-DDTHH:MM:SS)
3. **arrival_time**: Ankomsttid i ISO format (YYYY-MM-DDTHH:MM:SS)
4. **location**: Plats (t.ex. "Arlanda Terminal 5", "Stockholm Central")
5. **details**: Extra detaljer (bokningsnummer, check-in tid, etc.)
6. **booking_type**: "flight", "train", "hotel", eller "other"

Om någon information saknas, använd null.

Svara ENDAST med valid JSON:
{
  "title": "...",
  "departure_time": "2025-10-29T14:10:00" eller null,
  "arrival_time": "2025-10-29T15:15:00" eller null,
  "location": "...",
  "details": "...",
  "booking_type": "flight"
}`,
          messages: [{
            role: 'user',
            content: `Ämne: ${subject}\n\nMeddelande:\n${emailBody}`
          }]
        });

        const bookingText = bookingExtraction.content[0].text;
        console.log('🤖 Claude booking extraction:', bookingText);

        let bookingData;
        try {
          const jsonMatch = bookingText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            bookingData = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error('Failed to parse booking JSON:', parseError);
          bookingData = null;
        }

        // Om vi fick booking data och det finns avgångstid, spara det i task_data
        if (bookingData && bookingData.departure_time) {
          console.log('✅ Booking data extracted:', bookingData);

          // Uppdatera email_task med booking_data
          await supabase
            .from('email_tasks')
            .update({
              task_data: {
                ...taskData,
                booking: bookingData  // Lägg till booking i task_data
              }
            })
            .eq('id', emailTask.id);

          res.json({
            success: true,
            message: 'Email processed and booking detected',
            email_task_id: emailTask.id,
            booking: bookingData
          });
          return;
        }
      } catch (bookingError) {
        console.error('Booking extraction failed:', bookingError);
        // Fortsätt med normal response om booking extraction failar
      }
    }

    res.json({
      success: true,
      message: 'Email processed and saved to queue',
      email_task_id: emailTask.id
    });

  } catch (error) {
    console.error('Email webhook error:', error);
    res.status(500).json({
      error: error.message || 'Failed to process email'
    });
  }
});

// Endpoint för Claude chat STREAMING (för voice assistant)
app.post('/api/claude-stream', authenticateUser, rateLimiter, async (req, res) => {
  try {
    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'Claude API not configured' });
    }

    const { messages, system, tools, max_tokens = 2000, model } = req.body || {};
    const selectedModel = model || 'claude-haiku-4-5';

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx buffering fix

    // Prepare system parameter
    let systemParam = Array.isArray(system) ? system : (system || '');

    try {
      // Stream from Claude
      const stream = await anthropic.messages.stream({
        model: selectedModel,
        max_tokens,
        system: systemParam,
        messages,
        tools: tools || [],
      });

      // Handle streaming events
      stream.on('text', (text) => {
        // Send text chunks to client (med markdown intact - renderas korrekt i UI)
        res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
      });

      stream.on('message', (message) => {
        // Send final message (with tool calls if any)
        res.write(`data: ${JSON.stringify({ type: 'message', message })}\n\n`);
      });

      stream.on('error', (error) => {
        console.error('Stream error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
      });

      stream.on('end', () => {
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      });

    } catch (streamError) {
      console.error('Streaming error:', streamError);
      res.write(`data: ${JSON.stringify({ type: 'error', error: streamError.message })}\n\n`);
      res.end();
    }

  } catch (error) {
    console.error('Claude stream endpoint error:', error);

    // If headers not sent yet, send error as JSON
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Failed to start stream' });
    } else {
      // Headers already sent, send as SSE
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }
});

// Endpoint för Claude chat (stödjer PDF-analys med document content)
app.post('/api/claude-chat', authenticateUser, rateLimiter, async (req, res) => {
  try {
    // Check if API key is available
    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'Claude API not configured' });
    }

    console.log('Claude chat request received');
    console.log('Body type:', typeof req.body);
    console.log('Body keys:', Object.keys(req.body || {}));
    console.log('Body:', JSON.stringify(req.body || {}).substring(0, 500));

    const { messages, system, tools, max_tokens = 2000, model } = req.body || {};

    // Intelligent model selection: Haiku 4.5 (default) vs Sonnet 4.5
    const selectedModel = model || 'claude-haiku-4-5';

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

    // Lägg till timeout för stora PDFs (60s)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      // Prepare system parameter with prompt caching support
      let systemParam;
      if (Array.isArray(system)) {
        // Client sent system as array (for caching)
        systemParam = system;
      } else if (typeof system === 'string' && system) {
        // Legacy: string system prompt (no caching)
        systemParam = system;
      } else {
        systemParam = '';
      }

      const response = await anthropic.messages.create({
        model: selectedModel,
        max_tokens,
        system: systemParam,
        messages,
        tools: tools || [],
      }, { signal: controller.signal });

      console.log(`✅ Claude ${selectedModel} response: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output tokens`);

      clearTimeout(timeout);
      res.json(response);
    } catch (apiError) {
      clearTimeout(timeout);
      throw apiError;
    }
  } catch (error) {
    console.error('Claude API error:', error);

    // Special handling for timeout
    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request timeout - PDF might be too large or complex'
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to communicate with Claude'
    });
  }
});

// Endpoint för Azure TTS
app.post('/api/azure-tts', authenticateUser, rateLimiter, async (req, res) => {
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

// Conversation history endpoints (Supabase + Redis cache)
app.post('/api/conversation/save', authenticateUser, async (req, res) => {
  try {
    const { history } = req.body;

    if (!history || !Array.isArray(history)) {
      return res.status(400).json({ error: 'History array required' });
    }

    const userId = req.user.id;
    const CACHE_VERSION = 'v2'; // Increment to invalidate old cache

    // 1. Save to Supabase (persistent storage)
    try {
      console.log('💾 Saving conversation history to Supabase:', history.length, 'messages');

      const { error } = await supabase
        .from('conversation_history')
        .upsert({
          user_id: userId,
          messages: history,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // 2. Cache in Redis (optional, for faster reads)
      if (redis) {
        try {
          const key = `conversation:${CACHE_VERSION}:${userId}`;
          await redis.setex(key, 86400, JSON.stringify(history)); // 24h TTL
          console.log('✅ Cached conversation in Redis');
        } catch (redisError) {
          console.warn('Redis cache failed (non-critical):', redisError.message);
        }
      }

      res.json({
        success: true,
        message: 'Conversation history saved',
        messages_count: history.length
      });

    } catch (dbError) {
      console.error('Supabase save error:', dbError);
      res.status(500).json({ error: 'Failed to save conversation history' });
    }
  } catch (error) {
    console.error('Conversation save error:', error);
    res.status(500).json({ error: 'Failed to save conversation history' });
  }
});

app.get('/api/conversation/load', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const CACHE_VERSION = 'v2'; // Must match save version
    const key = `conversation:${CACHE_VERSION}:${userId}`;

    // 1. Try Redis cache first (fast: ~5ms)
    if (redis) {
      try {
        const cached = await redis.get(key);
        if (cached && Array.isArray(cached) && cached.length > 0) {
          console.log('📥 Loaded conversation from Redis cache:', cached.length, 'messages');
          return res.json({
            success: true,
            history: cached,
            messages_count: cached.length,
            source: 'cache'
          });
        }
      } catch (redisError) {
        console.warn('Redis cache miss:', redisError.message);
        // Continue to Supabase
      }
    }

    // 2. Load from Supabase (slower: ~50-200ms)
    try {
      console.log('📥 Loading conversation from Supabase...');

      const { data, error } = await supabase
        .from('conversation_history')
        .select('messages')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - new user
          return res.json({
            success: true,
            history: null,
            message: 'No conversation history found'
          });
        }
        throw error;
      }

      const history = data?.messages || null;

      if (history && Array.isArray(history) && history.length > 0) {
        console.log('✅ Loaded conversation from Supabase:', history.length, 'messages');

        // Cache in Redis for next time
        if (redis) {
          try {
            await redis.setex(key, 86400, JSON.stringify(history));
            console.log('✅ Cached conversation in Redis');
          } catch (cacheError) {
            console.warn('Redis cache failed (non-critical):', cacheError.message);
          }
        }

        return res.json({
          success: true,
          history,
          messages_count: history.length,
          source: 'database'
        });
      }

      // Empty history
      return res.json({
        success: true,
        history: null,
        message: 'No conversation history found'
      });

    } catch (dbError) {
      console.error('Supabase load error:', dbError);
      res.status(500).json({ error: 'Failed to load conversation history' });
    }

  } catch (error) {
    console.error('Conversation load error:', error);
    res.status(500).json({ error: 'Failed to load conversation history' });
  }
});

// GET /api/preferences - Hämta user preferences med Redis cache
app.get('/api/preferences', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const redisKey = `preferences:${userId}`;

    // 1. Kolla Redis cache först (5ms)
    if (redis) {
      try {
        const cached = await redis.get(redisKey);
        if (cached) {
          const preferences = JSON.parse(cached);
          console.log('✅ Preferences from Redis cache');
          return res.json({
            success: true,
            preferences,
            from_cache: true
          });
        }
      } catch (cacheError) {
        console.warn('Redis cache corrupted, invalidating:', cacheError.message);
        await redis.del(redisKey).catch(() => {}); // Delete corrupted cache
      }
    }

    // 2. Hämta från Supabase (50ms)
    console.log('⏳ Fetching preferences from Supabase...');
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Failed to fetch preferences:', error);
      return res.status(500).json({ error: 'Failed to fetch preferences' });
    }

    // Om ingen preferences finns, skapa default
    const preferences = data || {
      user_id: userId,
      work_hours: { start: '09:00', end: '17:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
      travel_patterns: { frequent_routes: [], preferred_airline: null },
      meeting_preferences: { buffer_before: 15, buffer_after: 0, max_per_day: 4 },
      communication_style: 'casual',
      custom_context: null
    };

    // Spara i Redis cache (24h TTL)
    let cacheWarning = null;
    if (redis) {
      try {
        await redis.setex(redisKey, 86400, JSON.stringify(preferences));
      } catch (redisError) {
        console.warn('Redis cache save failed:', redisError.message);
        cacheWarning = 'Cache unavailable - preferences will be fetched from DB each time';
      }
    }

    res.json({
      success: true,
      preferences,
      from_cache: false,
      ...(cacheWarning && { warning: cacheWarning })
    });
  } catch (error) {
    console.error('Preferences fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// POST /api/preferences/invalidate - Invalidera preferences cache
app.post('/api/preferences/invalidate', authenticateUser, async (req, res) => {
  try {
    if (!redis) {
      return res.json({ success: true, message: 'No cache to invalidate' });
    }

    const userId = req.user.id;
    const redisKey = `preferences:${userId}`;

    await redis.del(redisKey);

    res.json({
      success: true,
      message: 'Preferences cache invalidated'
    });
  } catch (error) {
    console.error('Cache invalidation error:', error);
    res.status(500).json({ error: 'Failed to invalidate cache' });
  }
});

// POST /api/soniox/config - Return Soniox API key for WebSocket
// NOTE: This is safe because it's a server-side endpoint requiring authentication
app.post('/api/soniox/config', authenticateUser, async (req, res) => {
  try {
    const apiKey = process.env.SONIOX_API_KEY;
    if (!apiKey) {
      console.error('[Soniox] SONIOX_API_KEY missing in env');
      return res.status(500).json({ error: 'SONIOX_API_KEY missing' });
    }

    console.log('[Soniox] Returning API key for WebSocket streaming...');

    // Return config for Soniox WebSocket: wss://stt-rt.soniox.com/transcribe-websocket
    res.json({
      api_key: apiKey,
      model: 'stt-rt-preview',
      language_hints: ['sv']
    });
  } catch (error) {
    console.error('[Soniox] Config error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/google-routes - Google Routes API för multi-modal reseplanering
app.post('/api/google-routes', authenticateUser, async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY; // Samma nyckel för Routes API
    if (!apiKey) {
      console.error('[Google Routes] GOOGLE_PLACES_API_KEY missing in env');
      return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY missing' });
    }

    const { origin, destination, travelMode, departureTime } = req.body;

    // Routes API v2 använder POST med JSON body
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng
          }
        }
      },
      travelMode: travelMode || 'DRIVE', // DRIVE, BICYCLE, WALK, TRANSIT
      computeAlternativeRoutes: false,
      languageCode: 'sv',
      units: 'METRIC'
    };

    // routingPreference only supported for DRIVE mode
    if (travelMode === 'DRIVE') {
      requestBody.routingPreference = 'TRAFFIC_AWARE';
    }

    if (departureTime) {
      requestBody.departureTime = departureTime;
    }

    const url = `https://routes.googleapis.com/directions/v2:computeRoutes`;

    console.log(`[Google Routes] Computing route: ${origin.lat},${origin.lng} → ${destination.lat},${destination.lng} (${travelMode})`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline,routes.legs'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    console.log(`[Google Routes] Status: ${response.status}, Routes: ${data.routes?.length || 0}`);

    if (!response.ok) {
      console.error('[Google Routes] API error:', data);
      throw new Error(`Google Routes API error (${response.status}): ${data.error?.message || response.statusText}`);
    }

    res.json(data);
  } catch (error) {
    console.error('[Google Routes] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/google-places/nearby - Proxy för Google Places API (New)
app.post('/api/google-places/nearby', authenticateUser, async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error('[Google Places] GOOGLE_PLACES_API_KEY missing in env');
      return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY missing' });
    }

    const { location, radius, type, keyword, openNow, minPrice, maxPrice } = req.body;

    // Places API (New) request body
    const requestBody = {
      locationRestriction: {
        circle: {
          center: {
            latitude: location.lat,
            longitude: location.lng
          },
          radius: radius
        }
      }
    };

    // Add type filter if provided
    if (type) {
      requestBody.includedTypes = [type];
    }

    const url = 'https://places.googleapis.com/v1/places:searchNearby';

    console.log(`[Google Places] Fetching nearby places near ${location.lat},${location.lng} (radius: ${radius}m)`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours,places.types,places.location,places.id'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    console.log(`[Google Places] Response:`, data.places?.length || 0, 'places');

    if (!response.ok) {
      console.error('[Google Places] API error:', data);
      return res.status(500).json({ error: `Google Places API error: ${data.error?.message || response.statusText}` });
    }

    // Convert new format to legacy format for compatibility
    const legacyFormat = {
      status: 'OK',
      results: (data.places || []).map(place => ({
        place_id: place.id,
        name: place.displayName?.text || 'Unknown',
        vicinity: place.formattedAddress || '',
        rating: place.rating,
        user_ratings_total: place.userRatingCount,
        price_level: place.priceLevel === 'PRICE_LEVEL_FREE' ? 0 :
                     place.priceLevel === 'PRICE_LEVEL_INEXPENSIVE' ? 1 :
                     place.priceLevel === 'PRICE_LEVEL_MODERATE' ? 2 :
                     place.priceLevel === 'PRICE_LEVEL_EXPENSIVE' ? 3 :
                     place.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE' ? 4 : undefined,
        opening_hours: place.currentOpeningHours ? { open_now: place.currentOpeningHours.openNow } : undefined,
        types: place.types || [],
        geometry: {
          location: {
            lat: place.location?.latitude,
            lng: place.location?.longitude
          }
        }
      }))
    };

    res.json(legacyFormat);
  } catch (error) {
    console.error('[Google Places] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Sentry v10 error handler (replaces old Handlers.errorHandler)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// General error handler (after Sentry)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
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
          max_delay: 1.0, // Optimerat för low-latency (<5% accuracy loss enligt Speechmatics)
          max_delay_mode: 'flexible', // Flexibel så den väntar på naturliga pauser
          operating_point: 'enhanced',
          punctuation_overrides: {
            permitted_marks: ['.', ',', '?', '!', ':', ';'],
            sensitivity: 0.5
          },
          conversation_config: {
            end_of_utterance_silence_trigger: 0.7  // Hands-free mode: 700ms tystnad = utterance klar
          }
        }
      };

      speechmaticsWs.send(JSON.stringify(startMessage));
      console.log('📝 StartRecognition sent for Swedish');
    });

    speechmaticsWs.on('message', (data) => {
      // OMFATTANDE LOGGING - se ALLT från SM
      try {
        const parsed = JSON.parse(data);

        // KRITISKA MESSAGES - logga ALLT
        if (parsed.message === 'EndOfStream' || parsed.message === 'EndOfTranscript' || parsed.message === 'EndOfUtterance') {
          console.log('🔴🔴🔴 BACKEND SAW:', parsed.message, JSON.stringify(parsed, null, 2));
        } else if (parsed.message === 'AddTranscript') {
          console.log('📨 BACKEND: AddTranscript ->', parsed.metadata?.transcript);
        } else if (parsed.message !== 'AudioAdded') {
          console.log('📨 BACKEND:', parsed.message);
        }
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
