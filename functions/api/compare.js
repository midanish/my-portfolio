// Cloudflare Pages Function: POST /api/compare
// Answers one question with two bots (standard RAG vs structure-aware RAG) and
// returns both answers with their evidence. Logic lives in lib/rag.mjs so the
// evaluation script measures exactly what the site runs.
import { prepareIndex, compare, ANSWER_PROMPT_VERSION } from '../../lib/rag.mjs';

const MAX_QUESTION_CHARS = 400;
const LIMIT_PER_MINUTE = 8; // per visitor IP, per worker instance (best effort)
const hits = new Map();
let cached = null; // index is static per deployment, so cache it per instance

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    if (tooMany(ip)) {
      return json({ error: 'Too many questions in a short time. Please wait a minute and try again.' }, 429);
    }

    const body = await request.json().catch(() => ({}));
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question) return json({ error: 'Please type a question.' }, 400);
    if (question.length > MAX_QUESTION_CHARS) {
      return json({ error: `Please keep questions under ${MAX_QUESTION_CHARS} characters.` }, 400);
    }

    if (!cached) {
      const res = await fetch(new URL('/data/kb/index.json', request.url));
      cached = prepareIndex(await res.json());
    }

    const results = await compare(cached, question, env);
    return json({
      run_id: crypto.randomUUID(),
      question,
      source_version: cached.version,
      prompt_version: ANSWER_PROMPT_VERSION,
      results,
    });
  } catch (error) {
    console.error('Compare error:', error);
    return json({ error: 'The comparison could not run right now. Please try again in a moment.' }, 503);
  }
}

function tooMany(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT_PER_MINUTE;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
