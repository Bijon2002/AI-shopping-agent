import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ArrowRight, Trash2, Plus, Minus } from 'lucide-react';
import { useStore } from '../store';
import CheckoutForm from './CheckoutForm';

export default function CartDrawer() {
  const { cart, setCartOpen, updateQty, removeFromCart, addMessage, clearCart } = useStore();
  const [checkoutMode, setCheckoutMode] = useState(false);
  const total = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  const handleCheckoutComplete = (payUrl: string, orderNumber: string) => {
    addMessage({
      id: Date.now().toString(),
      role: 'assistant',
      text: `Machang, I've created the order!\n\n• Order: #${orderNumber}\n• Total: LKR ${total.toLocaleString()}\n\nClick below to pay securely.`,
      payLink: payUrl,
      orderNumber,
    });
    clearCart();
    setCartOpen(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setCartOpen(false)}
        className="fixed inset-0 z-40"
        style={{ background: 'var(--overlay)' }}
      />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 flex flex-col theme-t"
        style={{
          background: 'var(--bg-base)',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div className="flex-none px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5C)' }}>
              <ShoppingBag size={16} className="text-white" />
            </div>
            <h2 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              {checkoutMode ? 'Checkout' : 'Cart'}
            </h2>
            {!checkoutMode && cart.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-kado-orange/15 text-kado-orange">
                {cart.length} {cart.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.9, rotate: 90 }}
            onClick={() => setCartOpen(false)}
            className="p-2 rounded-xl transition-colors theme-t"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </motion.button>
        </div>

        {cart.length === 0 && !checkoutMode ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-surface)' }}>
              <ShoppingBag size={28} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Your cart is empty</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Ask KADO to find you something nice!</p>
            </div>
          </div>
        ) : checkoutMode ? (
          <CheckoutForm cartItems={cart} onComplete={handleCheckoutComplete} />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <AnimatePresence>
                {cart.map((item, idx) => (
                  <motion.div
                    key={item.product.id}
                    layout
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.05 }}
                    className="flex gap-3 rounded-xl p-3 items-center theme-t"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                  >
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name}
                        className="w-14 h-14 rounded-lg object-cover" style={{ background: 'var(--bg-elevated)' }} />
                    ) : (
                      <div className="w-14 h-14 rounded-lg flex items-center justify-center text-xl" style={{ background: 'var(--bg-elevated)' }}>🎁</div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.product.name}</h4>
                      <span className="text-[11px] text-kado-gold font-bold block mt-0.5">
                        LKR {(item.product.price * item.qty).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 rounded-lg px-1 py-0.5" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-default)' }}>
                      <button onClick={() => updateQty(item.product.id, item.qty - 1)} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}><Minus size={11} /></button>
                      <span className="text-xs px-1.5 font-bold min-w-[16px] text-center" style={{ color: 'var(--text-primary)' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.product.id, item.qty + 1)} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}><Plus size={11} /></button>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash2 size={13} />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex-none px-6 py-5 space-y-4" style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                <span className="font-display font-extrabold text-xl gradient-text">
                  LKR {total.toLocaleString()}
                </span>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setCheckoutMode(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 text-white font-display font-extrabold text-sm rounded-xl shadow-xl btn-primary relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Proceed to Checkout
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
