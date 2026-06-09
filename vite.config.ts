import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// ── MCP Server-Side Plugin ────────────────────────────────────────────────────
// Runs in Node.js (no CORS, no browser restrictions).
// Handles MCP session lifecycle and exposes a simple /api/mcp-call endpoint.

const KAPRUKA_MCP_URL = 'https://mcp.kapruka.com/mcp';

function mcpPlugin(): Plugin {
  let sessionId: string | null = null;
  let initPromise: Promise<string> | null = null;

  async function ensureSession(): Promise<string> {
    if (sessionId) return sessionId;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      console.log('[MCP plugin] Initializing session…');
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

      // Try multiple possible header names for session ID
      const sid =
        res.headers.get('mcp-session-id') ??
        res.headers.get('x-session-id') ??
        res.headers.get('session-id');

      if (sid) {
        sessionId = sid;
      } else {
        // Some servers put session ID in the JSON body
        try {
          const text = await res.text();
          const data = JSON.parse(text);
          sessionId = data?.result?.sessionId ?? data?.sessionId ?? 'stateless';
        } catch {
          sessionId = 'stateless';
        }
      }

      console.log('[MCP plugin] Session ID:', sessionId);

      // Fetch tool list to inspect schemas
      try {
        const toolsRes = await fetch(KAPRUKA_MCP_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            ...(sessionId && sessionId !== 'stateless' ? { 'Mcp-Session-Id': sessionId } : {}),
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
          }),
        });
        const toolsData = await readMCPResponse(toolsRes);
        console.log('[MCP plugin] Available tools & schemas:');
        toolsData?.result?.tools?.forEach((t: any) => {
          console.log(` - Tool: ${t.name}`);
        });
        
        // Write schemas to a file for inspection
        const fs = await import('fs');
        const path = await import('path');
        fs.writeFileSync(
          path.join(process.cwd(), 'mcp-schemas.json'),
          JSON.stringify(toolsData?.result?.tools, null, 2)
        );
        console.log('[MCP plugin] Wrote mcp-schemas.json');
      } catch (err: any) {
        console.warn('[MCP plugin] Failed to list tools:', err.message);
      }

      // Fire-and-forget: notifications/initialized
      fetch(KAPRUKA_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId && sessionId !== 'stateless'
            ? { 'Mcp-Session-Id': sessionId }
            : {}),
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      }).catch(() => {});

      return sessionId!;
    })();

    return initPromise;
  }

  async function readMCPResponse(res: Response): Promise<any> {
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('text/event-stream')) {
      // Read SSE line-by-line — cancel stream the moment we see a result.
      // NEVER use res.text() here; SSE streams don't close on their own.
      const reader = (res.body as any).getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines: string[] = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const parsed = JSON.parse(line.slice(5).trim());
              if (parsed.result !== undefined || parsed.error !== undefined) {
                reader.cancel().catch(() => {});
                return parsed;
              }
            } catch { /* incomplete chunk, keep reading */ }
          }
        }
      }
      return null;
    }
    return res.json();
  }


  return {
    name: 'mcp-server-plugin',
    configureServer(server) {
      server.middlewares.use('/api/mcp-call', (req, res, next) => {
        if (req.method !== 'POST') { next(); return; }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', async () => {
          try {
            const { tool, args } = JSON.parse(Buffer.concat(chunks).toString());
            console.log(`[MCP plugin] → ${tool}`, JSON.stringify(args).slice(0, 120));
            const sid = await ensureSession();

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

            console.log(`[MCP plugin] HTTP ${mcpRes.status} content-type: ${mcpRes.headers.get('content-type')}`);

            if (!mcpRes.ok) {
              const errText = await mcpRes.text().catch(() => mcpRes.statusText);
              console.error(`[MCP plugin] ✗ ${tool} error:`, errText.slice(0, 300));
              // Reset session on auth/session errors so next call re-initializes
              if (mcpRes.status === 400 || mcpRes.status === 401) {
                sessionId = null;
                initPromise = null;
              }
              res.writeHead(mcpRes.status, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: errText }));
              return;
            }

            const data = await readMCPResponse(mcpRes);
            console.log(`[MCP plugin] ✓ ${tool}:`, JSON.stringify(data).slice(0, 300));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data ?? { error: 'Empty response from MCP server' }));
          } catch (err: any) {
            console.error('[MCP plugin] Uncaught error:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message ?? 'Unknown error' }));
          }
        });
      });
    },
  };
}

// ── Vite Config ───────────────────────────────────────────────────────────────
export default defineConfig({
  plugins: [react(), tailwindcss(), mcpPlugin()],
});
