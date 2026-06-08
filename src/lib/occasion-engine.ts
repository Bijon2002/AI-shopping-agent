export interface OccasionInfo {
  name: string;
  emoji: string;
  recommendations: string;
  keywords: string[];
}

export const OCCASIONS: OccasionInfo[] = [
  {
    name: 'Birthday',
    emoji: '🎂',
    recommendations: 'Suggest cakes, flower bouquets, chocolates, or birthday gift combos.',
    keywords: ['birthday', 'birth day', 'bday', 'upan dina', 'upandinna', 'hbd']
  },
  {
    name: 'Wedding',
    emoji: '💍',
    recommendations: 'Suggest home goods, luxury gift sets, perfumes, or sweet baskets.',
    keywords: ['wedding', 'marriage', 'kasada', 'vivaha', 'anniversary']
  },
  {
    name: 'Avurudu',
    emoji: '🌾',
    recommendations: 'Suggest traditional sweetmeats (kavum, kokis), clothing (sarong, saree), or Avurudu hampers.',
    keywords: ['avurudu', 'aluth avurudda', 'aurudu', 'kavum', 'kokis']
  },
  {
    name: 'Amma (Mother)',
    emoji: '❤️',
    recommendations: 'Suggest premium flowers, greeting cards, customized gifts, or fruit baskets.',
    keywords: ['mother', 'mom', 'amma', 'ammata', 'mummy']
  },
  {
    name: 'Thatha (Father)',
    emoji: '👔',
    recommendations: 'Suggest wallets, belts, grooming kits, or non-perishable hampers.',
    keywords: ['father', 'dad', 'thatha', 'tatta', 'appachchi', 'daddy']
  },
  {
    name: 'Vesak',
    emoji: '🏮',
    recommendations: 'Suggest Vesak lanterns, greeting cards, and vegetarian food hampers.',
    keywords: ['vesak', 'wesa', 'lantern', 'poya']
  },
  {
    name: 'Christmas',
    emoji: '🎄',
    recommendations: 'Suggest Christmas cakes, hampers, wines (non-alcoholic), and toys.',
    keywords: ['christmas', 'xmas', 'nattal', 'santa']
  },
  {
    name: 'Valentine',
    emoji: '💖',
    recommendations: 'Suggest red roses, chocolates, teddy bears, and personalized jewelry.',
    keywords: ['valentine', 'love', 'kella', 'chooti', 'baba']
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
