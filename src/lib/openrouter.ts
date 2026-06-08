import { KAPRUKA_TOOLS, SYSTEM_PROMPT } from './tools';
import * as MCP from './kapruka-mcp';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function sendMessage(
  history: Array<{ role: 'user' | 'assistant'; content: any }>,
  onChunk: (text: string) => void,
  onProducts: (products: any[]) => void,
  onPayLink: (url: string) => void,
  onOrderConfirm: (orderNumber: string) => void,
  onToolStart: (toolName: string) => void,
  onToolEnd: (toolName: string, result: any) => void
) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    onChunk("Aney machan, you need to set VITE_OPENROUTER_API_KEY in your .env file!");
    return;
  }

  // Build the list of messages, starting with system prompt
  let currentMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  let keepRunning = true;
  let loops = 0;
  const maxLoops = 6;

  while (keepRunning && loops < maxLoops) {
    loops++;
    
    // Call OpenRouter
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://bijon.dev',
        'X-Title': 'KADO — Smart Sri Lankan Shopping',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: currentMessages,
        tools: KAPRUKA_TOOLS,
        tool_choice: 'auto'
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenRouter API error: ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error("Invalid response structure from OpenRouter");
    }

    const assistantMessage = choice.message;
    
    // Check if the assistant wants to call tools
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Append the assistant's tool-call message to messages
      currentMessages.push(assistantMessage);

      const toolResults = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const { name } = toolCall.function;
        const args = JSON.parse(toolCall.function.arguments);
        
        onToolStart(name);
        let result: any;

        try {
          if (name === 'kapruka_search_products') {
            result = await MCP.searchProducts(args.q, args);
            if (result?.products) {
              onProducts(result.products);
            }
          } else if (name === 'kapruka_check_delivery') {
            result = await MCP.checkDelivery(args.city, args.delivery_date, args.product_id);
          } else if (name === 'kapruka_list_delivery_cities') {
            result = await MCP.listDeliveryCities(args.query);
          } else if (name === 'kapruka_create_order') {
            result = await MCP.createOrder(args);
            if (result?.pay_url) {
              onPayLink(result.pay_url);
            }
            if (result?.order_number) {
              onOrderConfirm(result.order_number);
            }
          } else if (name === 'kapruka_track_order') {
            result = await MCP.trackOrder(args.order_number);
          } else {
            result = { error: `Tool ${name} not found` };
          }
        } catch (err: any) {
          result = { error: err.message || 'Tool execution failed' };
        }

        onToolEnd(name, result);
        
        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: name,
          content: JSON.stringify(result)
        });
      }

      currentMessages.push(...toolResults as any);
    } else {
      // Final response! We stream it if stream is set, or we can just send it.
      // Since we didn't stream this final call, let's stream it by requesting a stream completion,
      // or simply output the text directly. 
      // Let's call a streaming completion to make the text type out in real time
      // This gives the premium "feels alive" experience
      await streamText(currentMessages, apiKey, onChunk);
      keepRunning = false;
    }
  }
}

async function streamText(
  messages: any[],
  apiKey: string,
  onChunk: (text: string) => void
) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://bijon.dev',
      'X-Title': 'KADO — Smart Sri Lankan Shopping',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-sonnet',
      messages: messages,
      stream: true
    })
  });

  if (!res.ok) {
    onChunk("Aney machan, something went wrong while streaming the response.");
    return;
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder('utf-8');
  if (!reader) return;

  let buffer = '';
  let done = false;

  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const cleaned = line.replace(/^data: /, '').trim();
        if (cleaned === '[DONE]') continue;
        if (cleaned) {
          try {
            const parsed = JSON.parse(cleaned);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            // Ignore parse errors from incomplete lines
          }
        }
      }
    }
  }
}
