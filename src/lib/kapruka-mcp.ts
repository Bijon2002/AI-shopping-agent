import type { OrderPayload, KaprukProduct } from '../types';
import { filterMismatchedProducts } from './occasion-engine';
import type { OccasionInfo } from './occasion-engine';
import { extractSearchQuery, rerankResults } from './search-intelligence';

// All MCP calls go through our Vite Node.js plugin (no CORS, session managed there)
const API_BASE = '/api/mcp-call';

async function callMCPTool(toolName: string, args: Record<string, unknown>) {
  console.debug('[MCP] →', toolName, args);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for MCP tools

  let res;
  try {
    res = await fetch(API_BASE, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: toolName, args }),
    });
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error(`MCP Tool ${toolName} timed out after 20 seconds.`);
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await res.json();

  if (!res.ok || data?.error) {
    const msg = typeof data?.error === 'string' ? data.error : JSON.stringify(data?.error);
    console.error('[MCP] Error:', msg);
    throw new Error(`MCP error: ${msg}`);
  }

  console.debug('[MCP] ←', toolName, data);

  // MCP result is content array of typed blocks
  const content: any[] = data?.result?.content ?? [];
  const text = content
    .filter((c: any) => c.type === 'text')
    .map((c: any) => c.text)
    .join('');

  try {
    return JSON.parse(text);
  } catch {
    return text || data?.result;
  }
}

// ── Shared occasion context (set by ChatShell before each request) ──────────
let _currentOccasion: OccasionInfo | null = null;

/** Call this before every LLM request to inject the current occasion context */
export function setCurrentOccasion(occasion: OccasionInfo | null) {
  _currentOccasion = occasion;
}

// ── Public API ────────────────────────────────────────────────────────────────
// The Kapruka MCP server uses FastMCP. ALL functions are defined with a `params: Model` signature,
// which means EVERY tool call must wrap its parameters inside a `{ params: { ... } }` object.

export const searchProducts = async (
  q: string,
  opts?: {
    category?: string;
    min_price?: number;
    max_price?: number;
    in_stock_only?: boolean;
    limit?: number;
  }
) => {
  // ═══ STEP 1: LLM Query Rewriting ═══
  // Rewrites natural-language q into clean product keywords.
  // Fail-open: if it errors, uses original q.
  const cleaned = await extractSearchQuery(q, _currentOccasion?.name ?? undefined);

  // Always request 'json' format so we get structured products we can render in UI
  const raw = await callMCPTool('kapruka_search_products', {
    params: {
      q: cleaned.q,
      ...(cleaned.category && !opts?.category ? { category: cleaned.category } : {}),
      ...opts,
      response_format: 'json'
    }
  });

  // Map the raw results to our internal KaprukProduct format
  if (typeof raw === 'string') {
    return { error: raw, products: [] };
  }
  
  let products: KaprukProduct[] = (raw?.results ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price?.amount ?? 0,
    in_stock: p.in_stock ?? false,
    image_url: p.image_url ?? undefined,
    category: p.category?.name ?? undefined,
    description: p.summary ?? undefined,
    rating: p.rating ?? undefined,
  }));

  // ═══ STEP 2: Post-search occasion filter ═══
  // Remove products that are obviously mismatched with the detected occasion.
  const before = products.length;
  products = filterMismatchedProducts(products, _currentOccasion);
  if (products.length < before) {
    console.debug(
      `[MCP] Occasion filter removed ${before - products.length} mismatched product(s) for "${_currentOccasion?.name}"`
    );
  }

  // ═══ STEP 3: LLM Re-ranking ═══
  // Re-ranks results by relevance using LLM judgment.
  // Fail-open: if it errors or returns empty, uses unfiltered list.
  products = await rerankResults(products, q);

  return { products };
};

export const getProduct = async (product_id: string) => {
  const raw = await callMCPTool('kapruka_get_product', {
    params: {
      product_id,
      response_format: 'json'
    }
  });

  if (typeof raw === 'string') return raw;

  return {
    id: raw.id,
    name: raw.name,
    price: raw.price?.amount ?? 0,
    in_stock: raw.in_stock ?? false,
    image_url: raw.images?.[0] ?? undefined,
    category: raw.category?.name ?? undefined,
    description: raw.description ?? raw.summary ?? undefined,
  };
};

export const listCategories = () =>
  callMCPTool('kapruka_list_categories', {
    params: {}
  });

export const checkDelivery = (city: string, date: string, product_id?: string) =>
  callMCPTool('kapruka_check_delivery', {
    params: {
      city,
      delivery_date: date,
      ...(product_id ? { product_id } : {}),
    }
  });

export const listDeliveryCities = (query: string) =>
  callMCPTool('kapruka_list_delivery_cities', {
    params: { query }
  });

export const createOrder = (payload: OrderPayload) =>
  callMCPTool('kapruka_create_order', {
    params: payload as unknown as Record<string, unknown>
  });

export const trackOrder = (order_number: string) =>
  callMCPTool('kapruka_track_order', {
    params: { order_number, response_format: 'json' }
  });
