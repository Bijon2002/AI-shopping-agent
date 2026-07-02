import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Star, Tag, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../lib/translations';
import { useState, useEffect } from 'react';

export default function ProductDetailsModal() {
  const { language, selectedProductDetails, setSelectedProductDetails, addToCart } = useStore();
  const [added, setAdded] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | undefined>();

  useEffect(() => {
    if (selectedProductDetails) {
      setCurrentImage(selectedProductDetails.images?.[0] || selectedProductDetails.image_url);
    }
  }, [selectedProductDetails]);

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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl"
        style={{ background: 'var(--overlay)' }}
        onClick={() => setSelectedProductDetails(null)}
      >
        <motion.div
          initial={{ scale: 0.92, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md overflow-hidden rounded-3xl flex flex-col max-h-[85vh] theme-t"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Top border gradient */}
          <div className="h-[3px] w-full bg-gradient-to-r from-purple-500 via-Kapruka-orange to-Kapruka-gold" />

          {/* Close button */}
          <button
            onClick={() => setSelectedProductDetails(null)}
            className="absolute top-4 right-4 z-10 p-2 rounded-xl transition-colors theme-t"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            <X size={16} />
          </button>

          {/* Content Wrapper */}
          <div className="overflow-y-auto custom-scrollbar flex-1">
            {/* Product Image */}
            <div className="relative h-52 sm:h-60 w-full" style={{ background: 'var(--bg-elevated)' }}>
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">
                  🎁
                </div>
              )}
              {/* Category Badge */}
              {product.category && (
                <div className="absolute bottom-3 left-3 glass rounded-full px-2.5 py-1 flex items-center gap-1.5 text-[11px] text-Kapruka-gold font-bold">
                  <Tag size={11} />
                  <span className="capitalize">{product.category}</span>
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {product.images && product.images.length > 1 && (
              <div
                className="flex gap-2 p-2.5 overflow-x-auto custom-scrollbar"
                style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}
              >
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImage(img)}
                    className={`w-12 h-12 flex-none rounded-lg overflow-hidden border-2 transition-all ${currentImage === img ? 'border-Kapruka-orange shadow-md' : 'opacity-50 hover:opacity-100'}`}
                    style={{ borderColor: currentImage === img ? undefined : 'transparent' }}
                  >
                    <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Product Info */}
            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <h2
                  className="font-display text-lg sm:text-xl font-black tracking-tight leading-snug"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {product.name}
                </h2>
                
                {/* Rating & Stock */}
                <div className="flex items-center gap-3 mt-2.5">
                  {product.rating && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={11}
                          className={
                            i < Math.round(product.rating!)
                              ? 'text-Kapruka-gold fill-Kapruka-gold'
                              : ''
                          }
                          style={i >= Math.round(product.rating!) ? { color: 'var(--border-default)' } : undefined}
                        />
                      ))}
                      <span className="text-[11px] ml-1" style={{ color: 'var(--text-muted)' }}>({product.rating})</span>
                    </div>
                  )}

                  <span style={{ color: 'var(--border-default)' }}>|</span>

                  {product.in_stock ? (
                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[11px]">
                      <CheckCircle2 size={13} />
                      <span>{t.inStock}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-500 font-bold text-[11px]">
                      <AlertTriangle size={13} />
                      <span>{t.outOfStock}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Row */}
              <div
                className="flex items-baseline justify-between p-3.5 rounded-xl"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
              >
                <span className="text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>{t.price}</span>
                <span className="text-lg sm:text-xl font-extrabold text-Kapruka-gold font-display">
                  LKR {product.price?.toLocaleString()}
                </span>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h3 className="text-[11px] uppercase font-bold tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Info size={11} className="text-Kapruka-orange" />
                  <span>{t.viewProductDetails}</span>
                </h3>
                <p className="text-xs sm:text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {product.description || "No description provided for this item. Talk to your AI Buddy if you have questions about custom configurations, gift packaging options, or local delivery speeds."}
                </p>
              </div>

              {/* Available Stock Details */}
              <div
                className="p-3 rounded-xl text-[10px] leading-relaxed space-y-1"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
              >
                <div>📦 <strong style={{ color: 'var(--text-secondary)' }}>Availability:</strong> {product.in_stock ? 'Highly Available' : 'Temporarily Out of Stock'}</div>
                <div>📍 <strong style={{ color: 'var(--text-secondary)' }}>Fulfillment:</strong> Direct dispatch from Kapruka Colombo Hub</div>
                <div>🕒 <strong style={{ color: 'var(--text-secondary)' }}>Same Day Delivery:</strong> Available for orders placed before 3:00 PM (Colombo only)</div>
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div
            className="p-4 flex gap-3"
            style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-default)' }}
          >
            <motion.button
              whileHover={product.in_stock ? { scale: 1.02, boxShadow: '0 0 20px rgba(139,0,0,0.2)' } : {}}
              whileTap={product.in_stock ? { scale: 0.98 } : {}}
              onClick={handleAdd}
              disabled={!product.in_stock}
              className={`flex-1 py-3 rounded-xl font-display font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all ${
                added
                  ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                  : 'btn-primary text-white disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {added ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>{t.added}</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={15} />
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
