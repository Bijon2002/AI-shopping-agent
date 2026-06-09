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
  products?: KaprukProduct[];
  payLink?: string;
  orderNumber?: string;
  trackingData?: any;
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
