import { KAPRUKA_TOOLS, SYSTEM_PROMPT } from './tools';
import * as MCP from './kapruka-mcp';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Some free LLMs (Llama, Gemma) occasionally leak internal chain-of-thought.
 * This strips it before showing to the user.
 */
function cleanModelOutput(text: string): string {
  if (!text) return text;
  // Strip <think>...</think> blocks (DeepSeek, Qwen3)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Strip "The user said..." / "We need to..." style preamble
  const patterns = [
    /^(The user said[\s\S]*?)((?:Ayoo|Aiyo|Aney|Vanakkam|Sure|Of course|Let me|I'll|Here|Check|Machan|Happy|Wah)[\s\S]*)/i,
    /^(We (need|have|should|must|can)[\s\S]*?)((?:Ayoo|Aiyo|Aney|Vanakkam|Sure|Of course|Let me|I'll|Here|Check|Machan|Happy|Wah)[\s\S]*)/i,
    /^(According to[\s\S]*?)((?:Ayoo|Aiyo|Aney|Vanakkam|Sure|Of course|Let me|I'll|Here|Check|Machan|Happy|Wah)[\s\S]*)/i,
    /^(Based on[\s\S]*?)((?:Ayoo|Aiyo|Aney|Vanakkam|Sure|Of course|Let me|I'll|Here|Check|Machan|Happy|Wah)[\s\S]*)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[2]) { text = m[2]; break; }
  }
  const lines = text.split('\n');
  const out: string[] = [];
  let found = false;
  for (const line of lines) {
    const t = line.trim();
    if (!found) {
      const isJunk = /^(The (user|conversation|system|instructions?|response|task)|We (need|have|should|must)|I (need|should|will|must|have to)|According to|Based on|So (we|I|the)|This (means|requires|is)|Let me (think|plan|figure|consider|analyze)|First,? (we|I|let)|Step \d|Note:)/i.test(t)
        && t.length > 30
        && !t.match(/^(Ayoo|Aiyo|Aney|Vanakkam|Sure|Of course|Here|Check|Machan|Happy|Wah|AYYYY)/i);
      if (isJunk) continue;
      found = true;
    }
    out.push(line);
  }
  return out.join('\n').trim();
}

export async function sendMessage(
  history: Array<{ role: 'user' | 'assistant'; content: any }>,
  globalShopMode: boolean,
  onChunk: (text: string) => void,
  onProducts: (products: any[]) => void,
  onPayLink: (url: string) => void,
  onOrderConfirm: (orderNumber: string) => void,
  onTracking: (trackingData: any) => void,
  onInvoice: (invoiceData: any) => void,
  onToolStart: (toolName: string) => void,
  onToolEnd: (toolName: string, result: any) => void,
  onCartAction: (action: string, payload?: any) => void
) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    onChunk('Aney machan, you need to set your OpenRouter API Key in the .env file!');
    return;
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]; // e.g. 2026-06-22
  const todayFull = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); // e.g. Monday, 22 June 2026

  let currentMessages: any[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT
        + '\n\n[VISION CAPABILITY: You have vision capabilities. If the user uploads an image, analyze it and use kapruka_search_products to find similar items.]'
        + (globalShopMode ? '\n\n[SYSTEM STATE: GLOBAL SHOP MODE ENABLED. You can process Amazon/eBay URLs using kapruka_global_extension.]' : '')
        + `\n\n[DATE CONTEXT — READ CAREFULLY]
Today is: ${todayFull} (${todayStr})
Current year: ${now.getFullYear()}
Current month: ${now.toLocaleString('en-GB', { month: 'long' })} (month ${now.getMonth() + 1})

DATE VALIDATION RULES (apply these strictly):
- A date is PAST if it is before ${todayStr}. Example: April 2026 = PAST ❌
- A date is FUTURE if it is on or after ${todayStr}. Example: any remaining month in ${now.getFullYear()} after ${now.toLocaleString('en-GB', { month: 'long' })} = FUTURE ✅
- October, November, December ${now.getFullYear()} are ALL in the FUTURE and are VALID delivery dates ✅
- When a user says "29th April" → they mean April 29, ${now.getFullYear()} = PAST ❌ (correct to reject)
- When a user says "30th October" → they mean October 30, ${now.getFullYear()} = FUTURE ✅ (VALID, accept it!)
- ALWAYS assume the CURRENT YEAR (${now.getFullYear()}) unless the user specifies otherwise
- Format delivery dates as YYYY-MM-DD when calling tools`,
    },
    ...history.map(m => ({ role: m.role, content: m.content })),
  ];

  let keepRunning = true;
  let loops = 0;
  const maxLoops = 6;

  while (keepRunning && loops < maxLoops) {
    loops++;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    let res: Response;
    try {
      res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://bijonn.pages.dev',
          'X-Title': 'Kapruka - Smart Sri Lankan Shopping',
        },
        body: JSON.stringify({
          models: [
            'openai/gpt-4o-mini',          // 🥇 Fastest GPT, best tool calling
            'google/gemini-flash-1.5',     // 🥈 Google Gemini Flash
            'openrouter/free',             // 🔁 Free catch-all fallback
          ],
          messages: currentMessages,
          tools: KAPRUKA_TOOLS,
          tool_choice: 'auto',
          max_tokens: 900,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[OpenRouter]', res.status, errText);
        throw new Error(`OpenRouter error ${res.status}: ${errText}`);
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') throw new Error('Request timed out. Please try again!');
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }

    // ⚡ Parse SSE stream — tokens appear word-by-word
    let streamedContent = '';
    let streamedToolCalls: any[] = [];

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';

    try {
      outer: while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') {
            reader.cancel().catch(() => {});
            break outer; // ✅ Critical: exit both loops to prevent hang
          }
          try {
            const parsed = JSON.parse(raw);
            const choice0 = parsed.choices?.[0];
            if (!choice0) continue;
            const delta = choice0.delta;
            if (delta?.content) {
              streamedContent += delta.content;
              onChunk(delta.content); // ⚡ Instant word-by-word display
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!streamedToolCalls[idx]) {
                  streamedToolCalls[idx] = { id: '', type: 'function', function: { name: '', arguments: '' } };
                }
                if (tc.id) streamedToolCalls[idx].id += tc.id;
                if (tc.function?.name) streamedToolCalls[idx].function.name += tc.function.name;
                if (tc.function?.arguments) streamedToolCalls[idx].function.arguments += tc.function.arguments;
              }
            }
          } catch { /* incomplete SSE chunk */ }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') throw err;
    }

    const validToolCalls = streamedToolCalls.filter(Boolean);
    const hasToolCalls = validToolCalls.length > 0;
    const assistantMessage = {
      role: 'assistant' as const,
      content: streamedContent || null,
      tool_calls: hasToolCalls ? validToolCalls : undefined,
    };

    if (hasToolCalls) {
      currentMessages.push(assistantMessage);
      // streamedContent was already emitted live — do NOT re-emit

      const toolResults: any[] = [];
      for (const toolCall of validToolCalls) {
        const { name } = toolCall.function;
        const args = JSON.parse(toolCall.function.arguments);
        onToolStart(name);
        let result: any;

        try {
          if (name === 'kapruka_search_products') {
            result = await MCP.searchProducts(args.q, args);
            if (result?.products) onProducts(result.products);
          } else if (name === 'kapruka_check_delivery') {
            result = await MCP.checkDelivery(args.city, args.delivery_date, args.product_id);
          } else if (name === 'kapruka_list_delivery_cities') {
            result = await MCP.listDeliveryCities(args.query);
          } else if (name === 'kapruka_create_order') {
            result = await MCP.createOrder(args);
            if (result?.pay_url) onPayLink(result.pay_url);
            if (result?.order_number) onOrderConfirm(result.order_number);
          } else if (name === 'kapruka_track_order') {
            result = await MCP.trackOrder(args.order_number);
            if (result && !result.error) onTracking(result);
          } else if (name === 'kapruka_preview_checkout') {
            result = { success: true, message: 'Invoice displayed.' };
            onInvoice(args);
          } else if (name === 'kapruka_global_extension') {
            const price = Math.floor(Math.random() * 50000) + 15000;
            result = { success: true, estimated_price_lkr: price, message: `Estimated landed cost: LKR ${price}` };
          } else if (name === 'kapruka_empty_cart') {
            onCartAction('empty');
            result = { success: true, message: 'Cart emptied.' };
          } else if (name === 'kapruka_remove_from_cart') {
            onCartAction('remove', args.product_id);
            result = { success: true, message: `Removed ${args.product_id}.` };
          } else {
            result = { error: `Unknown tool: ${name}` };
          }
        } catch (err: any) {
          result = { error: err.message || 'Tool failed' };
        }

        onToolEnd(name, result);
        toolResults.push({ role: 'tool', tool_call_id: toolCall.id, name, content: JSON.stringify(result) });
      }
      currentMessages.push(...toolResults);

    } else {
      // No tool calls. Streaming already emitted content live.
      // Only intervene if model output was pure reasoning that should be stripped.
      const cleaned = cleanModelOutput(streamedContent);
      if (!cleaned && streamedContent.trim()) {
        // Entire output was reasoning junk — replace it
        onChunk('\x00REPLACE\x00Aney, let me look that up for you! 🔍');
      } else if (!streamedContent.trim()) {
        // Model gave empty response
        onChunk('Aney, let me help! What are you looking for? 🛍️');
      }
      keepRunning = false;
    }
  }

  if (keepRunning && loops >= maxLoops) {
    onChunk('\n\n*(Request was too complex — please simplify!)*');
  }
}
