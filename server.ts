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

// 2. Parser and Build Trigger endpoint
app.post('/api/build', async (req, res) => {
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

    if (result.diagnostics.length > 0 && result.diagnostics.some(d => d.severity === 'Error')) {
      res.status(400).json({ error: 'Syntax errors in BUILD file', diagnostics: result.diagnostics });
      return;
    }

    // Convert rules to Targets
    const targets: any[] = result.rules.map((r: any) => {
      const name = `//:${r.name || 'unnamed'}`;
      const srcs: string[] = [];
      if (r.args.srcs && r.args.srcs.type === 'ListExpr') {
         r.args.srcs.elements.forEach((e: any) => srcs.push(e.value));
      }
      const deps: string[] = [];
      if (r.args.deps && r.args.deps.type === 'ListExpr') {
         r.args.deps.elements.forEach((e: any) => {
            const cleanDep = e.value.startsWith(':') ? `//:${e.value.slice(1)}` : e.value;
            deps.push(cleanDep);
         });
      }
      return { name, ruleType: r.ruleType, srcs, deps };
    });

    // Compute independent batches using Kahn's algorithm
    const adj: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    const allNodesSet = new Set<string>();

    targets.forEach(t => {
      allNodesSet.add(t.name);
      if (!adj[t.name]) adj[t.name] = [];
      if (!(t.name in inDegree)) inDegree[t.name] = 0;

      t.deps.forEach((dep: string) => {
        allNodesSet.add(dep);
        if (!adj[dep]) adj[dep] = [];
        adj[dep].push(t.name);
        inDegree[t.name] = (inDegree[t.name] || 0) + 1;
        if (!(dep in inDegree)) inDegree[dep] = 0;
      });
    });

    const allNodes = Array.from(allNodesSet).sort();
    const tempInDegree = { ...inDegree };
    const batches: string[][] = [];
    let currentBatch: string[] = [];

    allNodes.forEach(n => {
      if (tempInDegree[n] === 0) currentBatch.push(n);
    });
    currentBatch.sort();

    while (currentBatch.length > 0) {
      batches.push(currentBatch);
      const nextBatch: string[] = [];
      currentBatch.forEach(u => {
        const neighbors = adj[u] || [];
        neighbors.forEach(v => {
          tempInDegree[v]--;
          if (tempInDegree[v] === 0) {
            nextBatch.push(v);
          }
        });
      });
      nextBatch.sort();
      currentBatch = nextBatch;
    }

    // Insert into DB
    const { query } = await import('./src/db/index');
    const sessionId = 'b-' + Math.floor(Math.random() * 9000 + 1000);
    const traceId = 'bf-' + Math.floor(Math.random() * 10000) + '-4b69-' + Math.floor(Math.random() * 10000);
    
    await query(
      `INSERT INTO build_sessions (id, status, trace_id, total_targets, start_time) VALUES ($1, $2, $3, $4, NOW())`,
      [sessionId, 'RUNNING', traceId, targets.length]
    );

    for (const target of targets) {
      await query(
        `INSERT INTO build_targets (name, session_id, status, cache_key) VALUES ($1, $2, $3, $4)`,
        [target.name, sessionId, 'QUEUED', Math.floor(Math.random() * 1000000).toString(16)]
      );
    }

    // Trigger async execution
    const { executeBuild } = await import('./src/lib/executor');
    executeBuild(sessionId, targets, batches);

    res.json({
      sessionId,
      traceId,
      status: 'RUNNING',
      totalTargets: targets.length,
      message: 'Build started in backend',
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error?.message || 'Parser internal failure' });
  }
});

// 2b. Status endpoint for polling
app.get('/api/build/:id', async (req, res) => {
  const sessionId = req.params.id;
  try {
    const { query } = await import('./src/db/index');
    const sessionRes = await query(`SELECT * FROM build_sessions WHERE id = $1`, [sessionId]);
    if (sessionRes.rows.length === 0) {
      res.status(404).json({ error: 'Build session not found' });
      return;
    }
    const session = sessionRes.rows[0];
    
    const targetsRes = await query(`SELECT * FROM build_targets WHERE session_id = $1`, [sessionId]);
    const workersRes = await query(`SELECT * FROM workers`);
    const logsRes = await query(`SELECT * FROM target_logs WHERE session_id = $1 ORDER BY created_at ASC`, [sessionId]);

    res.json({
      session,
      targets: targetsRes.rows,
      workers: workersRes.rows,
      logs: logsRes.rows
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch build status' });
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
