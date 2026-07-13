// Server-only. Provider-agnostic: swap providers via env vars, never hardcode
// one. Defaults to NVIDIA NIM's free tier (OpenAI-compatible API), since the
// runtime chat is cost-capped by design (CLAUDE.md Model usage & cost rules) —
// upgrading to a paid provider later is an env-var change, not a rebuild.
// Any OpenAI-compatible provider works unchanged; a genuinely different API
// shape (e.g. native Anthropic) would need a small adapter, not built here.

const AI_PROVIDER = process.env.AI_PROVIDER || 'nim';
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'meta/llama-3.1-8b-instruct';
const AI_BASE_URL =
  process.env.AI_BASE_URL ||
  (AI_PROVIDER === 'nim' ? 'https://integrate.api.nvidia.com/v1' : undefined);

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function getChatCompletion(messages: ChatMessage[]): Promise<string> {
  if (!AI_API_KEY || !AI_BASE_URL) {
    throw new Error('AI provider not configured (missing AI_API_KEY or AI_BASE_URL)');
  }

  const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
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

  if (!res.ok) {
    throw new Error(`AI provider (${AI_PROVIDER}) request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI provider returned no completion content');
  }
  return content;
}
