import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Star, Tag, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../lib/translations';
import { useState } from 'react';

export default function ProductDetailsModal() {
  const { language, selectedProductDetails, setSelectedProductDetails, addToCart } = useStore();
  const [added, setAdded] = useState(false);

  const t = translations[language] || translations.en;

  if (!selectedProductDetails) return null;

  const product = selectedProductDetails;

  const handleAdd = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl"
        onClick={() => setSelectedProductDetails(null)}
      >
        <motion.div
          initial={{ scale: 0.92, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_30px_70px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]"
          style={{ background: 'linear-gradient(180deg, rgba(24,24,27,0.9) 0%, rgba(9,9,11,0.95) 100%)' }}
        >
          {/* Top border gradient */}
          <div className="h-[3px] w-full bg-gradient-to-r from-purple-500 via-Kapruka-orange to-Kapruka-gold" />

          {/* Close button */}
          <button
            onClick={() => setSelectedProductDetails(null)}
            className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-black/40 border border-white/10 hover:bg-white/10 transition-colors text-white"
          >
            <X size={16} />
          </button>

          {/* Content Wrapper */}
          <div className="overflow-y-auto custom-scrollbar flex-1">
            {/* Product Image */}
            <div className="relative h-64 sm:h-72 w-full bg-black/40 border-b border-white/5">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl">
                  🎁
                </div>
              )}
              {/* Category Badge */}
              {product.category && (
                <div className="absolute bottom-4 left-4 glass rounded-full px-3 py-1 flex items-center gap-1.5 text-xs text-Kapruka-gold font-bold">
                  <Tag size={12} />
                  <span className="capitalize">{product.category}</span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">
                  {product.name}
                </h2>
                
                {/* Rating & Stock */}
                <div className="flex items-center gap-4 mt-3">
                  {product.rating && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={
                            i < Math.round(product.rating!)
                              ? 'text-Kapruka-gold fill-Kapruka-gold'
                              : 'text-white/10'
                          }
                        />
                      ))}
                      <span className="text-xs text-white/50 ml-1">({product.rating})</span>
                    </div>
                  )}

                  <span className="text-white/20">|</span>

                  {product.in_stock ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 size={14} />
                      <span>{t.inStock}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
                      <AlertTriangle size={14} />
                      <span>{t.outOfStock}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Row */}
              <div className="flex items-baseline justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-white/40 uppercase font-bold tracking-wider">{t.price}</span>
                <span className="text-xl sm:text-2xl font-extrabold text-Kapruka-gold font-display">
                  LKR {product.price?.toLocaleString()}
                </span>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-xs uppercase font-bold tracking-wider text-white/50 flex items-center gap-1.5">
                  <Info size={12} className="text-Kapruka-orange" />
                  <span>{t.viewProductDetails}</span>
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed text-white/70">
                  {product.description || "No description provided for this item. Talk to your AI Buddy if you have questions about custom configurations, gift packaging options, or local delivery speeds."}
                </p>
              </div>

              {/* Available Stock Details */}
              <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] text-[11px] leading-relaxed text-white/40 space-y-1">
                <div>📦 <strong className="text-white/70">Availability:</strong> {product.in_stock ? 'Highly Available' : 'Temporarily Out of Stock'}</div>
                <div>📍 <strong className="text-white/70">Fulfillment:</strong> Direct dispatch from Kapruka Colombo Hub</div>
                <div>🕒 <strong className="text-white/70">Same Day Delivery:</strong> Available for orders placed before 3:00 PM (Colombo only)</div>
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="p-6 bg-black/40 border-t border-white/5 flex gap-4">
            <motion.button
              whileHover={product.in_stock ? { scale: 1.02, boxShadow: '0 0 20px rgba(255,107,43,0.2)' } : {}}
              whileTap={product.in_stock ? { scale: 0.98 } : {}}
              onClick={handleAdd}
              disabled={!product.in_stock}
              className={`flex-1 py-3.5 rounded-xl font-display font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all ${
                added
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'btn-primary text-white disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {added ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>{t.added}</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={16} />
                  <span>{t.addToCart}</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
