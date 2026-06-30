import type { OrderPayload, KaprukProduct } from '../types';
import { filterMismatchedProducts, occasionMap } from './occasion-engine';
import type { OccasionInfo } from './occasion-engine';
import { parseIntent, rerankResults } from './search-intelligence';

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

async function runSearch(q: string, opts: any): Promise<KaprukProduct[]> {
  const raw = await callMCPTool('kapruka_search_products', {
    params: { q, ...opts, response_format: 'json' }
  });
  
  if (typeof raw === 'string') return [];
  
  return (raw?.results ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price?.amount ?? 0,
    in_stock: p.in_stock ?? false,
    image_url: p.image_url ?? undefined,
    category: p.category?.name ?? undefined,
    description: p.summary ?? undefined,
    rating: p.rating ?? undefined,
  })) as KaprukProduct[];
}

export const smartSearch = async (
  rawQuery: string,
  opts?: {
    category?: string;
    min_price?: number;
    max_price?: number;
    in_stock_only?: boolean;
    limit?: number;
  }
) => {
  const intent = await parseIntent(rawQuery);
  const detectedOccasion = intent.occasion ? occasionMap[intent.occasion.toLowerCase()] : undefined;
  const occasionConfig = detectedOccasion || _currentOccasion;
  const relaxed: string[] = [];

  const attempts = [
    () => runSearch(intent.product, { ...opts }),
    () => { relaxed.push('price'); return runSearch(intent.product, { ...opts, max_price: undefined, min_price: undefined }); },
    () => { relaxed.push('occasion-filter-skip'); return runSearch(intent.product, { ...opts, max_price: undefined, min_price: undefined }); },
    () => { relaxed.push('broadened-category'); return runSearch(occasionConfig?.searchTerms?.[0] ?? 'gift', {}); },
  ];

  for (const attempt of attempts) {
    let products = await attempt();
    if (occasionConfig && relaxed[relaxed.length - 1] !== 'occasion-filter-skip') {
      products = filterMismatchedProducts(products, occasionConfig);
    }
    if (products.length > 0) {
      return { products: await rerankResults(products, rawQuery), relaxed };
    }
  }
  
  // Last attempt's result, however thin, beats showing nothing
  const last = await attempts[attempts.length - 1]();
  return { products: await rerankResults(last, rawQuery), relaxed };
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
