/**
 * Search Intelligence — LLM-powered query rewriting and result re-ranking.
 *
 * Both functions are pinned to gpt-4o-mini (cheap, reliable) and fail-open:
 * if either throws or returns garbage, the caller gets the original input back.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const INTEL_MODEL = 'openai/gpt-4o-mini'; // pinned, no fallback array

// Simple in-memory cache to save LLM round-trips for identical searches
const queryCache = new Map<string, ParsedIntent>();

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

export interface ParsedIntent {
  product: string;
  recipient?: string;
  location?: string;
  occasion?: string;
  max_price?: number;
  min_price?: number;
}

const PARSE_INTENT_SYSTEM_PROMPT = `Decompose the user's request into separate fields. Do not blend them.
- product: concrete item/category to search for (translate Sinhala/Tamil to English). If unclear, infer from occasion (e.g. birthday → "cake", anniversary → "flowers"). If still unclear, use "gift".
- recipient: who it's for (mom, sister, girlfriend, etc) — for context only, NEVER include in product
- location: any city/delivery location mentioned — for context only, NEVER include in product
- occasion: birthday, anniversary, wedding, etc — must be the SPECIFIC word used by the user, do not generalize anniversary→wedding or similar
- max_price / min_price: if a budget is mentioned

Respond ONLY as JSON matching this schema:
{
  "product": "string",
  "recipient": "string",
  "location": "string",
  "occasion": "string",
  "max_price": 100,
  "min_price": 10
}`;

export async function parseIntent(rawQuery: string): Promise<ParsedIntent> {
  const cacheKey = `intent:${rawQuery.toLowerCase()}`;
  if (queryCache.has(cacheKey)) {
    console.debug(`[SearchIntel] Cache hit for parseIntent: "${rawQuery}"`);
    return queryCache.get(cacheKey) as any;
  }

  try {
    const userMsg = `Query: "${rawQuery}"`;
    const content = await callIntelLLM(PARSE_INTENT_SYSTEM_PROMPT, userMsg, 120);
    const parsed = JSON.parse(content);

    if (!parsed.product || typeof parsed.product !== 'string' || parsed.product.trim().length === 0) {
      console.warn('[SearchIntel] parseIntent returned empty product, using original q');
      parsed.product = rawQuery;
    }

    const result: ParsedIntent = {
      product: parsed.product.trim(),
      recipient: parsed.recipient?.trim() || undefined,
      location: parsed.location?.trim() || undefined,
      occasion: parsed.occasion?.trim() || undefined,
      max_price: parsed.max_price || undefined,
      min_price: parsed.min_price || undefined,
    };
    
    if (queryCache.size > 1000) queryCache.clear(); 
    queryCache.set(cacheKey, result as any);

    console.debug(`[SearchIntel] Parsed intent:`, result);
    return result;
  } catch (e: any) {
    console.warn('[SearchIntel] parseIntent failed, using original q:', e.message);
    return { product: rawQuery };
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
