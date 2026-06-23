import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { Lexer as TsLexer, Parser as TsParser } from './src/lib/parser';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini safely
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
} catch (e) {
  console.error('Failed to initialize GoogleGenAI SDK', e);
}

// 1. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// 2. Parser endpoint for realtime validation
app.post('/api/parse-build', (req, res) => {
  const { code } = req.body;
  if (typeof code !== 'string') {
    res.status(400).json({ error: 'Missing or invalid code body' });
    return;
  }

  try {
    const lexer = new TsLexer(code, 'BUILD');
    const tokens = lexer.tokenize();
    const parser = new TsParser(tokens);
    const result = parser.parse();

    res.json({
      tokens,
      rules: result.rules,
      diagnostics: result.diagnostics,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Parser internal failure' });
  }
});

// 3. Gemini Staff C++ / Distributed Systems Engineer Copilot
app.post('/api/chat', async (req, res) => {
  const { messages, buildState } = req.body;
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: 'Messages are required and must be an array' });
    return;
  }

  if (!ai) {
    res.status(503).json({
      reply: "The Gemini API integration is not available because GEMINI_API_KEY is not configured in your settings. Please add your key in the AI Studio Secrets panel.",
      unconfigured: true
    });
    return;
  }

  try {
    const formattedHistory = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const systemInstruction = `You are a distinguished Google Staff Software Engineer and absolute elite expert in Bazel, C++, compilers, distributed systems, and massive build infrastructure.
Your task is to provide feedback on C++, BUILD files, dependency cycles, work-stealing scheduling thread pool architectures, and cache issues inside BuildForge.
Speak with extreme expertise, clarity, and authority. Keep advice highly actionable. Avoid generic fluff.
The user is working with a build pipeline simulated in BuildForge.
Current Build State details (if any):
${JSON.stringify(buildState || {}, null, 2)}`;

    // Use chats API or simple generateContent
    const userPrompt = messages[messages.length - 1].content;
    const previousContents = formattedHistory.slice(0, -1);

    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        ...previousContents,
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ reply: result.text || "No response received" });
  } catch (error: any) {
    console.error('Gemini Copilot Error:', error);
    res.status(500).json({ error: error?.message || 'Failed to contact Gemini Staff Engineer Copilot' });
  }
});

async function startServer() {
  // Vite dev server mounting after API routes
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

 app.listen(3000, '0.0.0.0', () => {
  console.log('Server running at http://localhost:3000');
});
}

startServer();
