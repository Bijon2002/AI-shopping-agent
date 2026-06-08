import type { OrderPayload } from '../types';

const MCP_URL = import.meta.env.VITE_KAPRUKA_MCP_URL || 'https://mcp.kapruka.com/mcp';

// Generic MCP tool caller
async function callMCPTool(toolName: string, params: Record<string, unknown>) {
  const body = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: { name: toolName, arguments: params },
  };

  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  // Parse markdown content or JSON content from MCP response
  const content = data.result?.content ?? [];
  const text = content
    .filter((c: any) => c.type === 'text')
    .map((c: any) => c.text)
    .join('');

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const searchProducts = (
  q: string,
  opts?: {
    category?: string;
    min_price?: number;
    max_price?: number;
    in_stock_only?: boolean;
    limit?: number;
  }
) => callMCPTool('kapruka_search_products', { q, ...opts });

export const getProduct = (product_id: string) =>
  callMCPTool('kapruka_get_product', { product_id });

export const listCategories = () =>
  callMCPTool('kapruka_list_categories', {});

export const checkDelivery = (city: string, date: string, product_id?: string) =>
  callMCPTool('kapruka_check_delivery', { city, delivery_date: date, product_id });

export const listDeliveryCities = (query: string) =>
  callMCPTool('kapruka_list_delivery_cities', { query });

export const createOrder = (payload: OrderPayload) =>
  callMCPTool('kapruka_create_order', payload as unknown as Record<string, unknown>);

export const trackOrder = (order_number: string) =>
  callMCPTool('kapruka_track_order', { order_number });
