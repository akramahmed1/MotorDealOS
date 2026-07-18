// Diagnostic only: sends the exact same request shape as
// src/lib/ai.ts getChatCompletion() directly to the AI provider,
// bypassing the whole app, so a failure here proves it's a provider/config
// problem, not an app-layer bug. Never commit real key values — this script
// only reads them from your own shell environment.
//
// Usage (run locally, values sourced from Vercel's env vars, never pasted
// into chat):
//   set AI_API_KEY=your-real-nim-key         (cmd.exe)
//   set AI_MODEL=meta/llama-3.1-8b-instruct  (or whatever's set in Vercel)
//   set AI_BASE_URL=https://integrate.api.nvidia.com/v1
//   node scripts/test-ai-provider.mjs

const AI_PROVIDER = process.env.AI_PROVIDER || 'nim';
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'meta/llama-3.1-8b-instruct';
const AI_BASE_URL =
  process.env.AI_BASE_URL ||
  (AI_PROVIDER === 'nim' ? 'https://integrate.api.nvidia.com/v1' : undefined);

if (!AI_API_KEY || !AI_BASE_URL) {
  console.error('Missing AI_API_KEY or AI_BASE_URL in this shell. Set them first (see comment at top of this file).');
  process.exit(1);
}

console.log('Testing AI provider with:');
console.log('  AI_PROVIDER:', AI_PROVIDER);
console.log('  AI_MODEL:   ', AI_MODEL);
console.log('  AI_BASE_URL:', AI_BASE_URL);
console.log('  AI_API_KEY: ', AI_API_KEY.slice(0, 6) + '...' + AI_API_KEY.slice(-4), `(${AI_API_KEY.length} chars)`);
console.log('');

const messages = [
  { role: 'system', content: 'You are a helpful assistant for a used car dealership.' },
  { role: 'user', content: 'Say hello in one short sentence.' },
];

const url = `${AI_BASE_URL}/chat/completions`;
console.log('POST', url);

const start = Date.now();
try {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      max_tokens: 400,
      temperature: 0.4,
    }),
  });

  const elapsed = Date.now() - start;
  const bodyText = await res.text();

  console.log(`\nStatus: ${res.status} ${res.statusText} (${elapsed}ms)`);
  console.log('Response headers:');
  for (const [k, v] of res.headers.entries()) {
    console.log(`  ${k}: ${v}`);
  }
  console.log('\nResponse body:');
  try {
    console.log(JSON.stringify(JSON.parse(bodyText), null, 2));
  } catch {
    console.log(bodyText);
  }
} catch (err) {
  const elapsed = Date.now() - start;
  console.error(`\nRequest threw after ${elapsed}ms:`, err);
}
