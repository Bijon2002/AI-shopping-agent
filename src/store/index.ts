import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { KaprukProduct, Message, CartItem, ChatSession } from '../types'

interface KadoStore {
  // Chat
  messages: Message[]
  addMessage: (msg: Message) => void
  updateLastAssistant: (text: string, products?: KaprukProduct[], payLink?: string, orderNumber?: string, trackingData?: any) => void
  clearMessages: () => void

  // History
  sessions: ChatSession[]
  activeSessionId: string | null
  historyOpen: boolean
  setHistoryOpen: (open: boolean) => void
  loadSession: (id: string) => void
  deleteSession: (id: string) => void
  
  // Cart
  cart: CartItem[]
  cartOpen: boolean
  addToCart: (p: KaprukProduct, qty?: number) => void
  removeFromCart: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clearCart: () => void
  setCartOpen: (open: boolean) => void
  
  // Wishlist
  wishlist: KaprukProduct[]
  wishlistOpen: boolean
  toggleWishlist: (p: KaprukProduct) => void
  isWishlisted: (id: string) => boolean
  setWishlistOpen: (open: boolean) => void
  
  // Checkout
  payLink: string | null
  setPayLink: (url: string | null) => void
  
  // Occasion Engine detected context
  detectedOccasion: string | null
  setDetectedOccasion: (occ: string | null) => void
}

// Load wishlist from localStorage
function loadWishlist(): KaprukProduct[] {
  try {
    const stored = localStorage.getItem('Kapruka-wishlist');
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveWishlist(items: KaprukProduct[]) {
  try { localStorage.setItem('Kapruka-wishlist', JSON.stringify(items)); } catch {}
}

export const useStore = create<KadoStore>()(
  persist(
    (set, get) => ({
      messages: [],
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      updateLastAssistant: (text, products, payLink, orderNumber, trackingData) => set((s) => {
        const msgs = [...s.messages]
        const last = msgs.findLastIndex((m) => m.role === 'assistant')
        if (last >= 0) {
          msgs[last] = { 
            ...msgs[last], 
            text, 
            ...(products !== undefined && { products }),
            ...(payLink !== undefined && { payLink }),
            ...(orderNumber !== undefined && { orderNumber }),
            ...(trackingData !== undefined && { trackingData })
          }
        }
        return { messages: msgs }
      }),
      clearMessages: () => set((s) => {
        // Before clearing, save the current session if it has user messages
        const hasUserMessage = s.messages.some(m => m.role === 'user')
        if (hasUserMessage) {
          const newSession: ChatSession = {
            id: s.activeSessionId || Date.now().toString(),
            title: s.messages.find(m => m.role === 'user')?.text.slice(0, 30) + '...' || 'New Chat',
            date: Date.now(),
            messages: [...s.messages]
          }
          
          const existingSessionIndex = s.sessions.findIndex(sess => sess.id === newSession.id)
          let newSessions = [...s.sessions]
          
          if (existingSessionIndex >= 0) {
             newSessions[existingSessionIndex] = newSession
          } else {
             newSessions.push(newSession)
          }

          return { 
            messages: [], 
            activeSessionId: null,
            sessions: newSessions
          }
        }
        return { messages: [], activeSessionId: null }
      }),

      sessions: [],
      activeSessionId: null,
      historyOpen: false,
      setHistoryOpen: (open) => set({ historyOpen: open }),
      loadSession: (id) => set((s) => {
        const session = s.sessions.find(sess => sess.id === id)
        if (session) {
          return { messages: session.messages, activeSessionId: id, historyOpen: false }
        }
        return s
      }),
      deleteSession: (id) => set((s) => ({
        sessions: s.sessions.filter(sess => sess.id !== id),
        ...(s.activeSessionId === id ? { activeSessionId: null, messages: [] } : {})
      })),
      
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
  
  // Wishlist
  wishlist: loadWishlist(),
  wishlistOpen: false,
  toggleWishlist: (product) => set((s) => {
    const exists = s.wishlist.some((p) => p.id === product.id);
    const next = exists
      ? s.wishlist.filter((p) => p.id !== product.id)
      : [...s.wishlist, product];
    saveWishlist(next);
    return { wishlist: next };
  }),
  isWishlisted: (id) => get().wishlist.some((p) => p.id === id),
  setWishlistOpen: (open) => set({ wishlistOpen: open }),
  
  payLink: null,
  setPayLink: (url) => set({ payLink: url }),
  
  detectedOccasion: null,
  setDetectedOccasion: (occ) => set({ detectedOccasion: occ }),
    }),
    {
      name: 'Kapruka-storage', // name of the item in the storage (must be unique)
      partialize: (state) => ({ 
        sessions: state.sessions, 
        activeSessionId: state.activeSessionId, 
        messages: state.messages,
        cart: state.cart // let's persist cart too!
      }), // only persist these fields
    }
  )
)
