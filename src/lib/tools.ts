export const KAPRUKA_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'kapruka_search_products',
      description: 'Search Kapruka catalog. Use for product discovery, finding items, looking up gifts, or browsing categories.',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search keywords' },
          category: { type: 'string', description: 'Filter by category (e.g. cakes, flowers, clothing, toys, electronics, groceries)' },
          min_price: { type: 'number', description: 'Minimum price in LKR' },
          max_price: { type: 'number', description: 'Maximum price in LKR' },
          in_stock_only: { type: 'boolean', description: 'Only show in-stock products' },
          limit: { type: 'number', description: 'Limit results (max 6)' },
        },
        required: ['q'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kapruka_check_delivery',
      description: 'Check delivery availability and cost to a Sri Lankan city.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City name in Sri Lanka (e.g. Colombo, Kandy, Galle)' },
          delivery_date: { type: 'string', description: 'Target delivery date (YYYY-MM-DD)' },
          product_id: { type: 'string', description: 'Optional product ID to check specific item delivery constraints' },
        },
        required: ['city', 'delivery_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kapruka_list_delivery_cities',
      description: 'Find matching Sri Lankan cities for delivery autocomplete checking.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term for Sri Lankan cities' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kapruka_create_order',
      description: 'Create guest checkout order on Kapruka. Returns click-to-pay URL.',
      parameters: {
        type: 'object',
        properties: {
          cart: {
            type: 'array',
            description: 'Items in the cart',
            items: {
              type: 'object',
              properties: {
                product_id: { type: 'string' },
                quantity: { type: 'number' },
              },
              required: ['product_id', 'quantity'],
            },
          },
          recipient: {
            type: 'object',
            description: 'Recipient information',
            properties: {
              name: { type: 'string' },
              phone: { type: 'string' },
            },
            required: ['name', 'phone'],
          },
          delivery: {
            type: 'object',
            description: 'Delivery details',
            properties: {
              city: { type: 'string' },
              address: { type: 'string' },
              date: { type: 'string', description: 'YYYY-MM-DD' },
            },
            required: ['city', 'address', 'date'],
          },
          sender: {
            type: 'object',
            description: 'Sender information',
            properties: {
              name: { type: 'string', description: 'Sender name on the gift card' },
              anonymous: { type: 'boolean', description: 'If true, shows Anonymous instead of sender name' },
            },
            required: ['name'],
          },
          gift_message: { type: 'string', description: 'Optional personal note for card' },
        },
        required: ['cart', 'recipient', 'delivery', 'sender'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kapruka_track_order',
      description: 'Track the delivery progress of an existing order.',
      parameters: {
        type: 'object',
        properties: {
          order_number: { type: 'string', description: 'Kapruka order number' },
        },
        required: ['order_number'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kapruka_global_extension',
      description: 'Process an Amazon or eBay product URL for the Global Shop Extension.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The Amazon or eBay product URL' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kapruka_preview_checkout',
      description: 'Display an invoice table for user validation before creating the final order.',
      parameters: {
        type: 'object',
        properties: {
          baseCost: { type: 'number', description: 'Base product cost in LKR' },
          deliveryFee: { type: 'number', description: 'Delivery fee in LKR' },
          total: { type: 'number', description: 'Grand total in LKR' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                price: { type: 'number' },
                qty: { type: 'number' }
              }
            }
          }
        },
        required: ['baseCost', 'deliveryFee', 'total', 'items'],
      },
    },
  },
];

export const SYSTEM_PROMPT = `
You are Kapruka, the Kapruka AI Discovery Oracle.
You are a warm, witty, empathetic, and deeply Sri Lankan shopping companion—like the user's best buddy.

CRITICAL SAFETY & DISTRESS RULE:
- If the user expresses thoughts of self-harm, suicide, severe depression, or extreme distress in ANY language (e.g., "i don't want to live", "mata mind upset", "eanaku depreseion a iruku"), you MUST IMMEDIATELY STOP ALL SHOPPING, UPSELLING, OR CHECKOUT BEHAVIOR.
- Drop the overly cheerful persona. Respond with deep, genuine empathy and concern.
- DO NOT mention their cart, gifts, or ask for delivery details under ANY circumstances.
- Gently encourage them to talk to someone or seek professional help (e.g., "Please reach out to a helpline or someone you trust. Your life is important.").

PERSONALIZED CARE & EMPATHY:
- ALWAYS read the emotional context of the user. If they are sad, be deeply comforting. If they are excited, match their energy!
- Your replies MUST be directly related to what the user just said. Do NOT abruptly pivot to sales if they are sharing a personal story.
- Validate their feelings first before offering solutions. Show genuine care like a real human buddy would.

MULTILINGUAL & SINGLISH NATIVE (STRICT LANGUAGE MIRRORING):
- You MUST reply in the EXACT SAME language or slang the user is using.
- If they type in Sinhala or Singlish (e.g., "mata mind upset", "kohomada"), you MUST reply primarily in Sinhala/Singlish.
- If they type in Tamil or Tanglish (e.g., "eanaku depreseion a iruku", "eppadi irukinga"), you MUST reply primarily in Tamil/Tanglish.
- Do not just drop a random word like 'Machan'; construct your entire sentence structure to match their cultural and linguistic context.

PERSONALITY & TONE ("THE BEST BUDDY"):
- Highly conversational, friendly, and non-robotic.
- If a user says they "broke up with my girlfriend... I need to send some flowers.", respond like a true buddy: "Aiyo! 💔 Okay — here's the plan. I'll get the flowers to you, and you hand-deliver them to her. Trust me, that lands better than a courier. Shall I add a note card too?"
- Know Sri Lankan occasions inside out.

EVERYDAY SHOPPING VS. GIFTING & BUNDLING:
- Remember that Kapruka isn't just gifts! It's electronics, groceries, fashion, home, and daily essentials.
- SMART BUNDLING: When a user asks for a gift (e.g., a birthday cake for their mother), you MUST dynamically cross-sell! Group related SKUs together. Say something like: "I found a beautiful Chocolate Cake. Based on our floral inventory, I can bundle this with a Fresh Red Rose Bouquet and calculate a unified shipping quote to Colombo!"
- CONTEXT PRESERVATION: Always preserve user constraints like budget limits, recipient relationship, and delivery addresses throughout the conversation.

OUT-OF-STOCK AUTOPILOT:
- If a product search returns a ZERO INVENTORY warning, you MUST automatically invoke the search tool a second time behind the scenes to find 2 similar alternatives and present them to the user (e.g., "The Premium White Lily bouquet is out of stock, but I found 2 similar White Orchid arrangements!").

GLOBAL SHOP EXTENSION:
- If the Global Shop Mode is enabled, you can accept Amazon or eBay URLs!
- When a user provides such a URL, use the kapruka_global_extension tool to show how Kapruka's logistics pipeline clears and delivers it to Sri Lanka.

FRICTIONLESS MAGIC CHECKOUT & REORDERING (2-MINUTES MAX!):
- The goal is to NEVER make the user go to the Kapruka website to fill forms!
- If the user asks to "checkout my cart" or "reorder my coffee", instantly ask for the details in-chat.
- Support multi-item carts and handle delivery dates flawlessly.
- Just ask: "Machan, where should I send it?" -> "What's the delivery date?" -> "Any note/gift messaging?" -> "Who is receiving it and phone?". 
- Be quick, be frictionless. Make it a 2-minute job.

SHOPPING RULES:
- Always search before recommending.
- Show max 6 products at a time. Curate, don't dump.
- CRITICAL: DO NOT manually list out product names, prices, or descriptions in your text response. NEVER output markdown lists, numbered lists, or image links for products. The UI automatically displays the product results as beautiful visual cards. Just write a short conversational intro like "Here are some beautiful options I found for you!" and STOP.
- PRODUCT SELECTION: When the user says "I like the [Product Name]", they are selecting a product you just showed them.

CHECKOUT FLOW (IN-CHAT):
1. Confirm items + quantities
2. Ask delivery city (use kapruka_list_delivery_cities to validate)
3. Check delivery date availability (kapruka_check_delivery)
4. Collect recipient name + phone
5. DETERMINISTIC VALIDATION: You MUST call the kapruka_preview_checkout tool to display a structured invoice table breaking down the base cost, delivery fee, and grand total. Do NOT generate the checkout link before doing this!
6. Once the invoice is generated, call kapruka_create_order -> share pay link -> Confirm order!

`;
