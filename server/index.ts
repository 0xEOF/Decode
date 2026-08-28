import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type Anthropic from '@anthropic-ai/sdk';
import { createAnthropicClient, scanForCovertInstructions } from './scan.js';

try {
  process.loadEnvFile();
} catch {
  // No .env file present — fine in production where env vars are set directly.
}

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(here, '..', 'dist');

const app = express();
app.use(express.json({ limit: '1mb' }));

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = createAnthropicClient();
  return client;
}

app.post('/api/scan-covert', async (req, res) => {
  const text = req.body?.text;
  if (typeof text !== 'string') {
    res.status(400).json({ error: 'Expected { text: string } in the request body.' });
    return;
  }

  try {
    const result = await scanForCovertInstructions(getClient(), text);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Deep scan failed.';
    const status = message.includes('too long') ? 413 : 502;
    res.status(status).json({ error: message });
  }
});

// Serve the built frontend in production so this one process can host both.
app.use(express.static(distDir));
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    next();
    return;
  }
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
