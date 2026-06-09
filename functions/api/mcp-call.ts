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

export async function onRequestPost(context) {
  try {
    const request = context.request;
    const body = await request.json();
    const { tool, args } = body;

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

    const data = await readMCPResponse(mcpRes);
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
