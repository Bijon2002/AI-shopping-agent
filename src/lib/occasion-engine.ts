export interface OccasionInfo {
  name: string;
  emoji: string;
  recommendations: string;
  keywords: string[];
  /** Words that should NEVER appear in results for this occasion */
  negativeKeywords: string[];
  /** Preferred search terms the LLM should use for this occasion */
  searchTerms: string[];
}

export const OCCASIONS: OccasionInfo[] = [
  {
    name: 'Birthday',
    emoji: '🎂',
    recommendations: 'Suggest cakes, flower bouquets, chocolates, or birthday gift combos.',
    keywords: ['birthday', 'birth day', 'bday', 'upan dina', 'upandinna', 'hbd'],
    negativeKeywords: [],
    searchTerms: ['birthday cake', 'birthday flowers', 'birthday chocolate', 'birthday gift'],
  },
  {
    name: 'Wedding',
    emoji: '💍',
    recommendations: 'Suggest home goods, luxury gift sets, perfumes, or sweet baskets.',
    keywords: ['wedding', 'marriage', 'kasada', 'vivaha', 'anniversary'],
    negativeKeywords: [],
    searchTerms: ['wedding gift', 'home decor', 'gift hamper', 'dinner set'],
  },
  {
    name: 'Avurudu',
    emoji: '🌾',
    recommendations: 'Suggest traditional sweetmeats (kavum, kokis), clothing (sarong, saree), or Avurudu hampers.',
    keywords: ['avurudu', 'aluth avurudda', 'aurudu', 'kavum', 'kokis'],
    negativeKeywords: [],
    searchTerms: ['avurudu hamper', 'sweetmeats', 'saree', 'sarong'],
  },
  {
    name: 'Amma (Mother)',
    emoji: '❤️',
    recommendations: 'Suggest premium flowers, greeting cards for mom, customized gifts, or fruit baskets.',
    keywords: ['mother', 'mom', 'amma', 'ammata', 'mummy'],
    negativeKeywords: [
      "father's day", 'fathers day', "father`s day", 'for dad', 'for father', 'for thatha',
      'for him', 'men gift', 'men\'s', 'mens ', 'grooming kit', 'shaving',
    ],
    searchTerms: ['flowers for mom', 'mothers day', 'gift for mother', 'chocolate gift box', 'greeting card mother'],
  },
  {
    name: 'Thatha (Father)',
    emoji: '👔',
    recommendations: 'Suggest wallets, belts, grooming kits, mugs, cakes, or non-perishable hampers.',
    keywords: ['father', 'dad', 'thatha', 'tatta', 'appachchi', 'daddy', "fathers day", "father's day", "fathers day gift", "dad's day"],
    negativeKeywords: [
      "mother's day", 'mothers day', "mother`s day", 'for mom', 'for mother', 'for amma',
      'for her', 'women gift', 'women\'s', 'womens ', 'saree', 'handbag',
      'bridal', 'baby shower', 'baby girl', 'kitchen set',
    ],
    searchTerms: ['fathers day gift', 'fathers day cake', 'fathers day mug', 'wallet for men', 'belt for men', 'perfume for men', 'men grooming', 'gift hamper for dad'],
  },
  {
    name: 'Vesak',
    emoji: '🏮',
    recommendations: 'Suggest Vesak lanterns, greeting cards, and vegetarian food hampers.',
    keywords: ['vesak', 'wesa', 'lantern', 'poya'],
    negativeKeywords: [],
    searchTerms: ['vesak lantern', 'vesak greeting card', 'vegetarian hamper'],
  },
  {
    name: 'Christmas',
    emoji: '🎄',
    recommendations: 'Suggest Christmas cakes, hampers, wines (non-alcoholic), and toys.',
    keywords: ['christmas', 'xmas', 'nattal', 'santa'],
    negativeKeywords: [],
    searchTerms: ['christmas cake', 'christmas hamper', 'christmas gift', 'toys'],
  },
  {
    name: 'Valentine',
    emoji: '💖',
    recommendations: 'Suggest red roses, chocolates, teddy bears, and personalized jewelry.',
    keywords: ['valentine', 'love', 'kella', 'chooti', 'baba'],
    negativeKeywords: [],
    searchTerms: ['red roses', 'valentine chocolate', 'teddy bear', 'perfume'],
  }
];

export function detectOccasion(text: string): OccasionInfo | null {
  const normalized = text.toLowerCase();
  for (const occasion of OCCASIONS) {
    if (occasion.keywords.some(keyword => normalized.includes(keyword))) {
      return occasion;
    }
  }
  return null;
}

export function getSystemContextNote(occasion: OccasionInfo): string {
  return `[SYSTEM NOTE - OCCASION ENGINE DETECTED: ${occasion.name} (${occasion.emoji}). Target recommendations: ${occasion.recommendations} Adjust your tone to match this festive/special mood!]`;
}

/**
 * Returns a strong instruction block that tells the LLM exactly which
 * search queries to use and which product names to exclude.
 */
export function getSearchGuidance(occasion: OccasionInfo): string {
  const lines = [
    `[SEARCH GUIDANCE — OCCASION: ${occasion.name}]`,
    `PREFERRED SEARCH QUERIES (use these exact terms when calling kapruka_search_products):`,
    ...occasion.searchTerms.map(t => `  • q="${t}"`),
  ];
  if (occasion.negativeKeywords.length > 0) {
    lines.push(
      ``,
      `⛔ NEGATIVE FILTER — NEVER show products whose name contains ANY of these words/phrases:`,
      ...occasion.negativeKeywords.map(k => `  • "${k}"`),
      `If a search returns products with these words in their name, SKIP them entirely. Do NOT display them to the user.`,
    );
  }
  return lines.join('\n');
}

/**
 * Post-search filter: removes products whose name matches any of the
 * occasion's negative keywords. Call this on raw search results before
 * showing them to the user.
 */
export function filterMismatchedProducts<T extends { name?: string }>(
  products: T[],
  occasion: OccasionInfo | null,
): T[] {
  if (!occasion || occasion.negativeKeywords.length === 0) return products;
  const neg = occasion.negativeKeywords.map(k => k.toLowerCase());
  return products.filter(p => {
    const name = (p.name ?? '').toLowerCase();
    return !neg.some(kw => name.includes(kw));
  });
}
