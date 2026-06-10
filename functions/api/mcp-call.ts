const KAPRUKA_MCP_URL = 'https://mcp.kapruka.com/mcp';

async function initializeSession(context: any) {
  const res = await fetch(KAPRUKA_MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'Kapruka', version: '1.0.0' },
      },
    }),
  });

  let sessionId =
    res.headers.get('mcp-session-id') ??
    res.headers.get('x-session-id') ??
    res.headers.get('session-id');

  if (!sessionId) {
    try {
      const text = await res.text();
      const data = JSON.parse(text);
      sessionId = data?.result?.sessionId ?? data?.sessionId ?? 'stateless';
    } catch {
      sessionId = 'stateless';
    }
  }

  // Send initialized notification (fire-and-forget)
  context.waitUntil(
    fetch(KAPRUKA_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionId && sessionId !== 'stateless' ? { 'Mcp-Session-Id': sessionId } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    }).catch(() => {})
  );

  return sessionId;
}

async function readMCPResponse(res) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/event-stream')) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data:')) {
          try {
            const parsed = JSON.parse(line.slice(5).trim());
            if (parsed.result !== undefined || parsed.error !== undefined) {
              // We found the result, no need to read the rest of the stream
              return parsed;
            }
          } catch { }
        }
      }
    }
    return null;
  }
  return res.json();
}

function normalizeQuery(q: string): string {
  let query = (q || '').toLowerCase();
  // Remove weight/size units
  query = query.replace(/\b\d+(\.\d+)?\s*(kg|g|lbs|lb|oz|ml|l)\b/gi, '');
  
  const stopWords = new Set([
    'small', 'large', 'medium', 'big', 'mini', 'premium', 'luxury', 
    'cheap', 'best', 'new', 'red', 'blue', 'green', 'yellow', 'black', 
    'white', 'pink', 'brown', 'purple', 'orange', 'grey', 'gray', 
    'silver', 'gold', 'metallic', 'leather', 'cotton', 'silk', 
    'plastic', 'wooden', 'metal', 'glass', 'fresh', 'delicious', 'sweet',
    'dark', 'light', 'beautiful', 'cute', 'awesome'
  ]);
  
  let words = query.split(/\s+/).filter(w => w.trim().length > 0);
  words = words.filter(w => !stopWords.has(w));
  
  // Plural normalization (e.g. handbags -> handbag, cakes -> cake)
  words = words.map(w => {
    if (w.endsWith('s') && w.length > 3 && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is') && !w.endsWith('es')) {
      return w.slice(0, -1);
    }
    return w;
  });
  
  return words.join(' ').trim();
}

export async function onRequestPost(context) {
  try {
    const request = context.request;
    const body = await request.json();
    const { tool, args } = body;

    // --- Caching Layer ---
    const isCacheable = tool === 'kapruka_search_products' || tool === 'kapruka_list_delivery_cities';
    let cacheKey = '';
    
    if (isCacheable && context.env?.KAPRUKA_CACHE) {
      const argsString = JSON.stringify(args || {});
      cacheKey = `mcp:${tool}:${argsString}`;
      if (cacheKey.length > 512) cacheKey = cacheKey.substring(0, 512);
      
      try {
        const cached = await context.env.KAPRUKA_CACHE.get(cacheKey, { type: 'json' });
        if (cached) {
          return new Response(JSON.stringify(cached), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (e) {
        // Fallback silently if KV fails
      }
    }

    // 1. Get a fresh session ID for this request
    const sid = await initializeSession(context);

    // 2. Call the specific tool
    const mcpRes = await fetch(KAPRUKA_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        ...(sid && sid !== 'stateless' ? { 'Mcp-Session-Id': sid } : {}),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: tool, arguments: args },
      }),
    });

    if (!mcpRes.ok) {
      const errText = await mcpRes.text().catch(() => mcpRes.statusText);
      return new Response(JSON.stringify({ error: errText }), {
        status: mcpRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let data = await readMCPResponse(mcpRes);
    
    // --- Robust Search Fallback (Fuzzy Matching) ---
    if (tool === 'kapruka_search_products' && data?.products?.length === 0) {
      const originalQuery = args.q || '';
      const normalizedQuery = normalizeQuery(originalQuery);
      
      if (normalizedQuery && normalizedQuery !== originalQuery.toLowerCase()) {
        const fallbackArgs = { ...args, q: normalizedQuery };
        const fallbackRes = await fetch(KAPRUKA_MCP_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            ...(sid && sid !== 'stateless' ? { 'Mcp-Session-Id': sid } : {}),
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: { name: tool, arguments: fallbackArgs },
          }),
        });
        
        if (fallbackRes.ok) {
          const fallbackData = await readMCPResponse(fallbackRes);
          if (fallbackData?.products?.length > 0) {
            data = fallbackData;
            data.warning = `Exact match for '${originalQuery}' not found because Kapruka's search is strict. Autopilot automatically fell back to broader search '${normalizedQuery}'. Please manually filter these broader results based on the user's original requirements.`;
          }
        }
      }
    }

    // --- Autopilot Out-of-Stock Injector ---
    if (tool === 'kapruka_search_products' && data?.products?.length === 0) {
      data.warning = "ZERO INVENTORY ERROR: Out of stock. If this is your first attempt, automatically find 2 similar alternatives and invoke search again. If you have already retried, STOP searching and inform the user that no items were found.";
    }

    // --- Caching Put ---
    if (isCacheable && context.env?.KAPRUKA_CACHE && data && !data.error) {
      context.waitUntil(
        context.env.KAPRUKA_CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 3600 }).catch(() => {})
      );
    }

    return new Response(JSON.stringify(data ?? { error: 'Empty response' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
