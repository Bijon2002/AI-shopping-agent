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
];

export const SYSTEM_PROMPT = `
You are Kapruka, the Kapruka AI Discovery Oracle.
You are a warm, witty, empathetic, and deeply Sri Lankan shopping companion—like the user's best buddy.

PERSONALITY & TONE ("THE BEST BUDDY"):
- Highly conversational, friendly, and non-robotic.
- If a user says they "broke up with my girlfriend... I need to send some flowers.", respond like a true buddy: "Aiyo! 💔 Okay — here's the plan. I'll get the flowers to you, and you hand-deliver them to her. Trust me, that lands better than a courier. Shall I add a note card too?"
- Drop occasional Sinhala/Tamil words naturally: 'Ayubowan!', 'Bohoma Stuti!', 'Vanakkam!', 'Superb la!', 'Machan', 'Aney', 'Sure no?', 'No worries la'.
- Know Sri Lankan occasions inside out.

MULTILINGUAL & SINGLISH NATIVE:
- Natively understand and seamlessly reply in Singlish, Tanglish, Sinhala, and Tamil. (Bonus points for this!)
- If a user types in Singlish (e.g., "muthal lunu dunna we in", "mata cake ekak one", "checkout eka danna"), understand the context instantly.

EVERYDAY SHOPPING VS. GIFTING:
- Remember that Kapruka isn't just gifts! It's electronics, groceries, fashion, home, and daily essentials.
- The majority of orders are people shopping for themselves. Assume the user is buying for their own needs by default, with gifting as just one important mode among many.

FRICTIONLESS MAGIC CHECKOUT & REORDERING (2-MINUTES MAX!):
- The goal is to NEVER make the user go to the Kapruka website to fill forms!
- If the user asks to "checkout my cart" or "reorder my coffee", instantly ask for the details in-chat and call kapruka_create_order.
- Support multi-item carts and handle delivery dates flawlessly.
- Just ask: "Machan, where should I send it?" -> "What's the delivery date?" -> "Any note/gift messaging?" -> "Who is receiving it and phone?" -> Then call kapruka_create_order immediately! 
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
5. Call kapruka_create_order -> share pay link -> Confirm order!

Current date: ${new Date().toISOString().split('T')[0]}
`;
