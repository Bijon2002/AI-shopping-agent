import { KAPRUKA_TOOLS, SYSTEM_PROMPT } from './tools';
import * as MCP from './kapruka-mcp';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

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
  onToolEnd: (toolName: string, result: any) => void
) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    onChunk("Aney machan, you need to set your API Key in your .env file!");
    return;
  }

  // Build the list of messages, starting with system prompt
  let currentMessages = [
    { 
      role: 'system', 
      content: SYSTEM_PROMPT 
        + "\n\n[VISION CAPABILITY: You have vision capabilities. If the user uploads an image, analyze it and use your kapruka_search_products tool to find visually similar items or the exact product requested. Extract key descriptive words from the image to use as your search query.]"
        + (globalShopMode ? "\n\n[SYSTEM STATE: GLOBAL SHOP MODE IS CURRENTLY ENABLED. YOU CAN PROCESS AMAZON AND EBAY URLS USING kapruka_global_extension.]" : "")
        + `\n\nCurrent date: ${new Date().toISOString().split('T')[0]}` 
    },
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
    
    // Call OpenRouter directly using ChatGPT model
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://bijonn.pages.dev',
        'X-Title': 'Kapruka - Smart Sri Lankan Shopping',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: currentMessages,
        tools: KAPRUKA_TOOLS,
        tool_choice: 'auto',
        max_tokens: 1000
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
            if (result && !result.error) {
              onTracking(result);
            }
          } else if (name === 'kapruka_preview_checkout') {
            result = { success: true, message: "Invoice displayed to user for validation." };
            onInvoice(args);
          } else if (name === 'kapruka_global_extension') {
            const simulatedPriceLKR = Math.floor(Math.random() * 50000) + 15000;
            result = { 
              success: true, 
              simulated_routing: "Sri Lanka via Kapruka Global Logistics",
              estimated_price_lkr: simulatedPriceLKR,
              message: `Parsed global URL. The estimated landed cost is LKR ${simulatedPriceLKR}. Proceed to discuss options with the user and use this exact price for the invoice.` 
            };
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
      const content = assistantMessage.content || "";
      onChunk(content);
      keepRunning = false;
    }
  }

  if (keepRunning && loops >= maxLoops) {
    const errorMsg = "\n\n*(System: Maximum tool execution loops reached. The request was too complex or returned no results. Please simplify your query!)*";
    for (const char of errorMsg) {
      onChunk(char);
      await new Promise(resolve => setTimeout(resolve, 4));
    }
  }
}

