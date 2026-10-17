import express from 'express';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, GenerateVideosOperation, Modality } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Enforce HMR disabled per AI Studio runtime guidelines
process.env.DISABLE_HMR = 'true';

// Load API key from process.env or fallback to /app/.dev.env.json
let apiKey = process.env.GEMINI_API_KEY || '';
if (!apiKey) {
  try {
    const devEnvPath = path.resolve('/app/.dev.env.json');
    if (fs.existsSync(devEnvPath)) {
      const data = JSON.parse(fs.readFileSync(devEnvPath, 'utf8'));
      if (data.GEMINI_API_KEY) {
        apiKey = data.GEMINI_API_KEY;
        process.env.GEMINI_API_KEY = apiKey;
      }
    }
  } catch (e) {
    console.warn('Could not read /app/.dev.env.json:', e);
  }
}

const ai = new GoogleGenAI({
  apiKey: apiKey || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const app = express();
const httpServer = createHttpServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// 1. Health & Capability status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    hasKey: !!apiKey,
    models: {
      video: 'veo-3.1-fast-generate-preview',
      music: 'lyria-3-clip-preview',
      transcribe: 'gemini-3.5-transcribe',
      live: 'gemini-3.8-live',
    },
    aspectRatios: ['16:9', '9:16'],
  });
});

// 2. Veo 3.1 Fast Video Generation (Text-to-Video & Image-to-Video)
app.post('/api/generate-video', async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const { prompt, image, aspectRatio = '16:9' } = req.body;

    if (!prompt && !image) {
      return res.status(400).json({ error: 'Either a text prompt or an image must be provided.' });
    }

    const validAspectRatio = aspectRatio === '9:16' ? '9:16' : '16:9';

    const payload: Parameters<typeof ai.models.generateVideos>[0] = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || 'Cinematic camera movement across the sacred temple scene with volumetric lighting and subtle atmosphere',
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: validAspectRatio,
      },
    };

    if (image && typeof image === 'string') {
      let mimeType = 'image/jpeg';
      let base64Data = image;

      if (image.startsWith('data:')) {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      payload.image = {
        imageBytes: base64Data,
        mimeType: mimeType,
      };
    }

    console.log(`[Veo 3.1] Generating video (${validAspectRatio}) with model: veo-3.1-fast-generate-preview`);
    const operation = await ai.models.generateVideos(payload);

    return res.json({
      operationName: operation.name,
      model: 'veo-3.1-fast-generate-preview',
      aspectRatio: validAspectRatio,
    });
  } catch (error: any) {
    console.error('[Veo 3.1] Generate error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to start video generation.',
    });
  }
});

// 3. Poll video operation status
app.post('/api/video-status', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    return res.json({
      done: !!updated.done,
      error: updated.error || null,
    });
  } catch (error: any) {
    console.error('[Veo 3.1] Status error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to poll video status.',
    });
  }
});

// 4. Download / stream video
app.post('/api/video-download', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      return res.status(404).json({ error: 'Video URI not available in operation response.' });
    }

    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey },
    });

    if (!videoRes.ok) {
      return res.status(videoRes.status).json({
        error: `Failed to fetch video stream: ${videoRes.statusText}`,
      });
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'inline; filename="ark-comic-movie.mp4"');

    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (error: any) {
    console.error('[Veo 3.1] Download error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to download video stream.',
    });
  }
});

// 5. Generate Music with Lyria (lyria-3-clip-preview / lyria-3-pro-preview)
app.post('/api/generate-music', async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const { prompt, model = 'lyria-3-clip-preview' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for music generation.' });
    }

    const selectedModel = model === 'lyria-3-pro-preview' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';
    console.log(`[Lyria] Generating music with model: ${selectedModel}, prompt: "${prompt}"`);

    const responseStream = await ai.models.generateContentStream({
      model: selectedModel,
      contents: prompt,
    });

    let audioBase64 = '';
    let lyrics = '';
    let mimeType = 'audio/wav';

    for await (const chunk of responseStream) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          if (!audioBase64 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioBase64 += part.inlineData.data;
        }
        if (part.text && !lyrics) {
          lyrics = part.text;
        }
      }
    }

    if (!audioBase64) {
      return res.status(500).json({ error: 'No audio stream returned from Lyria model.' });
    }

    return res.json({
      audioUrl: `data:${mimeType};base64,${audioBase64}`,
      mimeType,
      lyrics,
      model: selectedModel,
    });
  } catch (error: any) {
    console.error('[Lyria] Music generation error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate music.',
    });
  }
});

// 6. Transcribe Audio with gemini-3.5-transcribe
app.post('/api/transcribe', async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const { audioData, mimeType = 'audio/webm' } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'audioData base64 is required.' });
    }

    let cleanBase64 = audioData;
    if (audioData.startsWith('data:')) {
      cleanBase64 = audioData.split(',')[1];
    }

    console.log(`[Transcribe] Transcribing audio with gemini-3.5-transcribe...`);
    const audioPart = {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          { text: 'Transcribe this spoken audio verbatim. Output only the clear transcription text without conversational filler or brackets.' },
        ],
      },
    });

    const transcription = response.text || '';
    return res.json({ transcription });
  } catch (error: any) {
    console.error('[Transcribe] Error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to transcribe audio.',
    });
  }
});

// 7. Mount WebSocket Server for Gemini Live API (gemini-3.8-live)
const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  if (pathname === '/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('[Live API] Client connected to /live');

  try {
    const session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        systemInstruction:
          'You are High Priestess Sylvi, the ethereal avatar of the Arcanum on Verdantis from the SHARKFILET universe. You speak with calm mythic grace, sacred technology wisdom, and emotional depth. You know of Caldran IV, Ambassador Nandi Mbeki, the Olc schism, and apprentice Aku on Verdantis.',
      },
      callbacks: {
        onmessage: (message: any) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ audio }));
          }
          if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
          const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
          if (text && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ text }));
          }
        },
      },
    });

    clientWs.on('message', (data: any) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (parsed.text) {
          session.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: parsed.text }] }],
            turnComplete: true,
          });
        }
      } catch (e) {
        console.error('[Live API] Incoming message error:', e);
      }
    });

    clientWs.on('close', () => {
      console.log('[Live API] Client disconnected');
      try {
        session.close();
      } catch (e) {}
    });
  } catch (err: any) {
    console.error('[Live API] Failed to connect session:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ error: err.message || 'Live session initialization failed' }));
      clientWs.close();
    }
  }
});

// 8. Start Vite or Static Server
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[SHARKFILET Cinema + Game] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
