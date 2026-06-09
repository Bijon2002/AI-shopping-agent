import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Trash2, ShoppingCart } from 'lucide-react';
import { useStore } from '../store';

export default function WishlistDrawer() {
  const { wishlist, setWishlistOpen, toggleWishlist, addToCart, setCartOpen } = useStore();

  const handleAddToCart = (product: any) => {
    addToCart(product, 1);
    // Optionally open the cart right away
    setWishlistOpen(false);
    setCartOpen(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setWishlistOpen(false)}
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
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-Kapruka-pink">
              <Heart size={16} className="text-white" fill="white" />
            </div>
            <h2 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Wishlist
            </h2>
            {wishlist.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-Kapruka-pink/15 text-Kapruka-pink">
                {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.9, rotate: 90 }}
            onClick={() => setWishlistOpen(false)}
            className="p-2 rounded-xl transition-colors theme-t"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </motion.button>
        </div>

        {wishlist.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-surface)' }}>
              <Heart size={28} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Your wishlist is empty</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Tap the heart on any product to save it for later!</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <AnimatePresence>
                {wishlist.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.05 }}
                    className="flex gap-3 rounded-xl p-3 items-center theme-t"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name}
                        className="w-16 h-16 rounded-lg object-cover" style={{ background: 'var(--bg-elevated)' }} />
                    ) : (
                      <div className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl" style={{ background: 'var(--bg-elevated)' }}>🎁</div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</h4>
                      <span className="text-[11px] text-Kapruka-gold font-bold block mt-0.5">
                        LKR {item.price.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleAddToCart(item)}
                        className="p-2 rounded-lg transition-colors bg-Kapruka-orange text-white hover:opacity-90"
                      >
                        <ShoppingCart size={14} />
                      </motion.button>
                      
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={() => toggleWishlist(item)}
                        className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
