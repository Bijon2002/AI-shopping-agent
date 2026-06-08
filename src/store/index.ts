import { create } from 'zustand'
import type { KaprukProduct, Message, CartItem } from '../types'

interface KadoStore {
  // Chat
  messages: Message[]
  addMessage: (msg: Message) => void
  updateLastAssistant: (text: string, products?: KaprukProduct[], payLink?: string, orderNumber?: string) => void
  
  // Cart
  cart: CartItem[]
  cartOpen: boolean
  addToCart: (p: KaprukProduct, qty?: number) => void
  removeFromCart: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clearCart: () => void
  setCartOpen: (open: boolean) => void
  
  // Checkout
  payLink: string | null
  setPayLink: (url: string | null) => void
  
  // Occasion Engine detected context
  detectedOccasion: string | null
  setDetectedOccasion: (occ: string | null) => void
}

export const useStore = create<KadoStore>((set) => ({
  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastAssistant: (text, products, payLink, orderNumber) => set((s) => {
    const msgs = [...s.messages]
    const last = msgs.findLastIndex((m) => m.role === 'assistant')
    if (last >= 0) {
      msgs[last] = { 
        ...msgs[last], 
        text, 
        ...(products !== undefined && { products }),
        ...(payLink !== undefined && { payLink }),
        ...(orderNumber !== undefined && { orderNumber })
      }
    }
    return { messages: msgs }
  }),
  
  cart: [],
  cartOpen: false,
  addToCart: (product, qty = 1) => set((s) => {
    const existing = s.cart.find((i) => i.product.id === product.id)
    if (existing) {
      return {
        cart: s.cart.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + qty } : i
        ),
      }
    }
    return { cart: [...s.cart, { product, qty }] }
  }),
  removeFromCart: (id) => set((s) => ({
    cart: s.cart.filter((i) => i.product.id !== id),
  })),
  updateQty: (id, qty) => set((s) => ({
    cart: qty <= 0 
      ? s.cart.filter((i) => i.product.id !== id)
      : s.cart.map((i) => (i.product.id === id ? { ...i, qty } : i)),
  })),
  clearCart: () => set({ cart: [] }),
  setCartOpen: (open) => set({ cartOpen: open }),
  
  payLink: null,
  setPayLink: (url) => set({ payLink: url }),
  
  detectedOccasion: null,
  setDetectedOccasion: (occ) => set({ detectedOccasion: occ }),
}))
