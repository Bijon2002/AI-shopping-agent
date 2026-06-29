export interface KaprukProduct {
  id: string;
  name: string;
  price: number;
  rating?: number;
  in_stock: boolean;
  image_url?: string;
  category?: string;
  description?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  image?: string;
  products?: KaprukProduct[];
  payLink?: string;
  orderNumber?: string;
  trackingData?: any;
  invoiceData?: { baseCost: number; deliveryFee: number; total: number; items: any[] };
  isSystem?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  date: number;
  messages: Message[];
}

export interface CartItem {
  product: KaprukProduct;
  qty: number;
}

export interface OrderPayload {
  cart: {
    product_id: string;
    quantity: number;
  }[];
  recipient: {
    name: string;
    phone: string;
  };
  delivery: {
    city: string;
    address: string;
    date: string;
  };
  sender: {
    name: string;
    anonymous?: boolean;
  };
  gift_message?: string;
}

export interface SavedAddress {
  id: string;
  name: string;
  street: string;
  city: string;
  phone: string;
}

export interface SavedPerson {
  id: string;
  name: string;
  relation: string;
  birthday?: string;
}

export interface UserPreferences {
  dietary: string[];
  budgetMin: number;
  budgetMax: number;
  notes: string;
}

