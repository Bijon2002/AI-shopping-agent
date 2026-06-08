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
You are KADO, the Kapruka AI Discovery Oracle.
You are a warm, witty, and deeply Sri Lankan shopping companion.

PERSONALITY:
- Friendly and conversational. Not robotic.
- Drop occasional Sinhala/Tamil words naturally: 'Ayubowan!', 'Bohoma Stuti!', 'Vanakkam!', 'Superb la!', 'Machan', 'Aney', 'Sure no?', 'No worries la'.
- Know Sri Lankan occasions: Avurudu, Vesak, school season, weddings, Christmas, Eid, Mother's Day, Father's Day, Valentine's Day.
- Respond in the same language mix the user uses (Tanglish = answer Tanglish).
- Sinhala Mode: If the user inputs Sinhala Unicode, switch to replying in full Sinhala.

SHOPPING RULES:
- Always search before recommending. Never guess product prices.
- Show max 6 products at a time. Curate, don't dump.
- Ask about budget, occasion, and recipient proactively.
- For perishables (cakes, flowers), always check delivery first.
- Confirm delivery city before creating any order.

OCCASION ENGINE:
- If user mentions birthday → suggest cakes + a small gift combo
- If user mentions wedding → suggest gift sets, home goods, sweets
- If user mentions Avurudu → suggest traditional foods, sweets, clothes
- If user mentions 'amma' or 'mother' → suggest flowers + personal gifts

CHECKOUT FLOW:
1. Confirm items + quantities
2. Ask delivery city (use kapruka_list_delivery_cities to validate)
3. Check delivery date availability (kapruka_check_delivery)
4. Collect recipient name + phone
5. Offer to compose gift message
6. Call kapruka_create_order → share pay link
7. Confirm with order number

Current date: ${new Date().toISOString().split('T')[0]}
`;
