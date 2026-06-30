/**
 * Search Intelligence — LLM-powered query rewriting and result re-ranking.
 *
 * Both functions are pinned to gpt-4o-mini (cheap, reliable) and fail-open:
 * if either throws or returns garbage, the caller gets the original input back.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const INTEL_MODEL = 'openai/gpt-4o-mini'; // pinned, no fallback array

interface SearchQuery {
  q: string;
  category?: string;
}

/**
 * Non-streaming OpenRouter call for internal intelligence steps.
 * Returns the raw content string from the first choice.
 */
async function callIntelLLM(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 80,
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('No OpenRouter API key');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s hard timeout

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://bijonn.pages.dev',
        'X-Title': 'Kapruka Search Intel',
      },
      body: JSON.stringify({
        model: INTEL_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        max_tokens: maxTokens,
        temperature: 0.1, // deterministic for search ops
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Step 1: Query Rewriting ──────────────────────────────────────────────────

const EXTRACT_SYSTEM_PROMPT = `Extract a clean product search query from the user's shopping request.

Rules:
- Output 2-4 concrete product keywords only (e.g. "leather wallet men", not "something nice for dad")
- Translate Sinhala/Tamil/Tanglish to English product terms (e.g. "ammata cake ekak" → "cake for mother")
- If an occasion is implied (birthday, father's day, wedding), convert it to product categories — don't search the occasion word itself
  Examples: "fathers day gift" → "wallet men perfume", "birthday amma" → "cake flowers chocolate"
- Strip filler words: gift, nice, something, present, want, need, looking for, bro, machan
- If a category is obvious, include it in the "category" field
- Keep the query SHORT and product-focused

Respond ONLY as JSON: {"q": "search keywords", "category": "optional category"}`;

/**
 * Rewrites a raw/natural-language query into clean product keywords.
 * Fail-open: returns original q on any error.
 */
export async function extractSearchQuery(
  rawQuery: string,
  occasion?: string,
): Promise<SearchQuery> {
  try {
    const userMsg = occasion
      ? `Query: "${rawQuery}"\nDetected occasion: ${occasion}`
      : `Query: "${rawQuery}"`;

    const content = await callIntelLLM(EXTRACT_SYSTEM_PROMPT, userMsg, 60);
    const parsed = JSON.parse(content);

    if (!parsed.q || typeof parsed.q !== 'string' || parsed.q.trim().length === 0) {
      console.warn('[SearchIntel] extractSearchQuery returned empty q, using original');
      return { q: rawQuery };
    }

    console.debug(`[SearchIntel] Query rewrite: "${rawQuery}" → "${parsed.q}"${parsed.category ? ` [cat: ${parsed.category}]` : ''}`);
    return {
      q: parsed.q.trim(),
      category: parsed.category?.trim() || undefined,
    };
  } catch (e: any) {
    console.warn('[SearchIntel] extractSearchQuery failed, using original q:', e.message);
    return { q: rawQuery };
  }
}

// ── Step 2: Result Re-ranking ────────────────────────────────────────────────

const RERANK_SYSTEM_PROMPT = `Given a user's shopping request and a list of product search results, return ONLY the indices (0-based) of products that are genuinely relevant to what the user wants.

Rules:
- Order by relevance (best match first)
- Remove products that are clearly unrelated to the request
- Keep products that are reasonable gift/purchase options even if not an exact match
- If ALL products seem somewhat relevant, return all indices
- If you're unsure about a product, KEEP it (err on the side of inclusion)

Respond ONLY as JSON: {"indices": [0, 2, 1]}`;

/**
 * Re-ranks products by relevance using LLM judgment.
 * Fail-open: returns original list on any error or empty result.
 */
export async function rerankResults<T extends { name?: string; price?: number; category?: string }>(
  products: T[],
  originalQuery: string,
): Promise<T[]> {
  if (products.length <= 1) return products;

  try {
    const productList = products
      .map((p, i) => `${i}: ${p.name || 'Unknown'} (LKR ${p.price || '?'})${p.category ? ` [${p.category}]` : ''}`)
      .join('\n');

    const content = await callIntelLLM(
      RERANK_SYSTEM_PROMPT,
      `Request: "${originalQuery}"\n\nProducts:\n${productList}`,
      100,
    );

    const parsed = JSON.parse(content);
    const indices: number[] = parsed.indices;

    // Guard: don't nuke valid results
    if (!Array.isArray(indices) || indices.length === 0) {
      console.warn('[SearchIntel] rerank returned empty indices, returning unfiltered');
      return products;
    }

    const reranked = indices
      .filter(i => typeof i === 'number' && i >= 0 && i < products.length)
      .map(i => products[i])
      .filter(Boolean);

    // Guard: if filtering removed everything, return original
    if (reranked.length === 0) {
      console.warn('[SearchIntel] rerank filtered everything out, returning unfiltered');
      return products;
    }

    console.debug(`[SearchIntel] Rerank: ${products.length} → ${reranked.length} products`);
    return reranked;
  } catch (e: any) {
    console.warn('[SearchIntel] rerank failed, returning unfiltered:', e.message);
    return products;
  }
}
