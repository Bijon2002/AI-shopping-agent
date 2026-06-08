import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ShoppingBag, ArrowRight, Trash2, Plus, Minus } from 'lucide-react';
import { useStore } from '../store';
import CheckoutForm from './CheckoutForm';

export default function CartDrawer() {
  const {
    cart,
    setCartOpen,
    updateQty,
    removeFromCart,
    addMessage,
    clearCart
  } = useStore();

  const [checkoutMode, setCheckoutMode] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  const handleCheckoutComplete = (payUrl: string, orderNumber: string) => {
    // Post confirmation message to chat
    addMessage({
      id: Date.now().toString(),
      role: 'assistant',
      text: `Machang, I've created the order for you! Let's get this delivered. Here is your checkout summary:\n\n• Order Number: #${orderNumber}\n• Total Amount: LKR ${total.toLocaleString()}\n\nClick the button below to proceed to the secure payment page.`,
      payLink: payUrl,
      orderNumber: orderNumber
    });
    
    // Clear and close cart
    clearCart();
    setCartOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        onClick={() => setCartOpen(false)}
        className="fixed inset-0 bg-black z-40"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-kado-dark border-l border-white/5 z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex-none px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-kado-orange" />
            <h2 className="font-display font-bold text-white text-base">
              {checkoutMode ? 'Checkout Details' : 'Shopping Cart'}
            </h2>
          </div>
          <button
            onClick={() => setCartOpen(false)}
            className="p-1 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {cart.length === 0 && !checkoutMode ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-kado-muted">
              <ShoppingBag size={20} />
            </div>
            <p className="text-sm text-white/50">Your cart is empty machang.</p>
          </div>
        ) : checkoutMode ? (
          <CheckoutForm cartItems={cart} onComplete={handleCheckoutComplete} />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Items List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-3 bg-kado-surface/40 border border-white/5 rounded-xl p-3 items-center"
                >
                  {item.product.image_url ? (
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-12 h-12 rounded-lg object-cover bg-kado-surface"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-kado-surface flex items-center justify-center text-lg">
                      🎁
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate">{item.product.name}</h4>
                    <span className="text-[10px] text-kado-gold font-bold block mt-0.5">
                      LKR {item.product.price.toLocaleString()}
                    </span>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1.5 bg-kado-dark border border-white/5 rounded-lg p-1">
                    <button
                      onClick={() => updateQty(item.product.id, item.qty - 1)}
                      className="p-0.5 hover:bg-white/5 rounded text-white/60 hover:text-white"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="text-xs text-white px-1 font-bold min-w-[14px] text-center">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(item.product.id, item.qty + 1)}
                      className="p-0.5 hover:bg-white/5 rounded text-white/60 hover:text-white"
                    >
                      <Plus size={10} />
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-kado-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer Summary */}
            <div className="flex-none px-6 py-5 border-t border-white/5 bg-kado-surface/30 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Subtotal</span>
                <span className="font-display font-bold text-white text-base">
                  LKR {total.toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setCheckoutMode(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-kado-orange hover:bg-kado-orange/95 text-white font-display font-extrabold text-sm rounded-xl shadow-lg shadow-kado-orange/15 transition-all duration-300 transform active:scale-95 group"
              >
                Proceed to Checkout
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
