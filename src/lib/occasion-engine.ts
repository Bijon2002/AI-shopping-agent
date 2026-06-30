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

export const occasionMap: Record<string, OccasionInfo> = {
  'birthday': {
    name: 'Birthday',
    emoji: '🎂',
    recommendations: 'Suggest cakes, flower bouquets, chocolates, or birthday gift combos.',
    keywords: [],
    negativeKeywords: [],
    searchTerms: ['birthday cake', 'birthday flowers', 'birthday chocolate', 'birthday gift'],
  },
  'wedding': {
    name: 'Wedding',
    emoji: '💍',
    recommendations: 'Suggest home goods, luxury gift sets, perfumes, or sweet baskets.',
    keywords: [],
    negativeKeywords: [],
    searchTerms: ['wedding gift', 'home decor', 'gift hamper', 'dinner set'],
  },
  'anniversary': {
    name: 'Anniversary',
    emoji: '🥂',
    recommendations: 'Suggest flowers, chocolates, jewelry, or perfumes.',
    keywords: [],
    negativeKeywords: ['wedding-dress', 'bridal'],
    searchTerms: ['flowers', 'chocolates', 'jewelry', 'perfume'],
  },
  'avurudu': {
    name: 'Avurudu',
    emoji: '🌾',
    recommendations: 'Suggest traditional sweetmeats (kavum, kokis), clothing (sarong, saree), or Avurudu hampers.',
    keywords: [],
    negativeKeywords: [],
    searchTerms: ['avurudu hamper', 'sweetmeats', 'saree', 'sarong'],
  },
  'mothers day': {
    name: 'Mothers Day',
    emoji: '❤️',
    recommendations: 'Suggest premium flowers, greeting cards for mom, customized gifts, or fruit baskets.',
    keywords: [],
    negativeKeywords: [
      "father's day", 'fathers day', "father`s day", 'for dad', 'for father', 'for thatha',
      'for him', 'men gift', 'men\'s', 'mens ', 'grooming kit', 'shaving',
    ],
    searchTerms: ['flowers for mom', 'mothers day', 'gift for mother', 'chocolate gift box', 'greeting card mother'],
  },
  'fathers day': {
    name: 'Fathers Day',
    emoji: '👔',
    recommendations: 'Suggest wallets, belts, grooming kits, mugs, cakes, or non-perishable hampers.',
    keywords: [],
    negativeKeywords: [
      "mother's day", 'mothers day', "mother`s day", 'for mom', 'for mother', 'for amma',
      'for her', 'women gift', 'women\'s', 'womens ', 'saree', 'handbag',
      'bridal', 'baby shower', 'baby girl', 'kitchen set',
    ],
    searchTerms: ['fathers day gift', 'fathers day cake', 'fathers day mug', 'wallet for men', 'belt for men', 'perfume for men', 'men grooming', 'gift hamper for dad'],
  },
  'vesak': {
    name: 'Vesak',
    emoji: '🏮',
    recommendations: 'Suggest Vesak lanterns, greeting cards, and vegetarian food hampers.',
    keywords: [],
    negativeKeywords: [],
    searchTerms: ['vesak lantern', 'vesak greeting card', 'vegetarian hamper'],
  },
  'christmas': {
    name: 'Christmas',
    emoji: '🎄',
    recommendations: 'Suggest Christmas cakes, hampers, wines (non-alcoholic), and toys.',
    keywords: [],
    negativeKeywords: [],
    searchTerms: ['christmas cake', 'christmas hamper', 'christmas gift', 'toys'],
  },
  'valentine': {
    name: 'Valentine',
    emoji: '💖',
    recommendations: 'Suggest red roses, chocolates, teddy bears, and personalized jewelry.',
    keywords: [],
    negativeKeywords: [],
    searchTerms: ['red roses', 'valentine chocolate', 'teddy bear', 'perfume'],
  }
};

export function getOccasion(name: string): OccasionInfo | null {
  const normalized = name.toLowerCase().trim();
  // We can still map common slight variations to standard keys if needed, 
  // but rely primarily on the LLM outputting standard keys.
  for (const key of Object.keys(occasionMap)) {
    if (normalized.includes(key)) {
      return occasionMap[key];
    }
  }
  return occasionMap[normalized] || null;
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
