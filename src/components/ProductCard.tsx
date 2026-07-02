import { motion } from 'framer-motion';
import { ShoppingCart, Star, Check, Heart, Eye } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store';
import type { KaprukProduct } from '../types';
import { translations } from '../lib/translations';

export default function ProductCard({ product, onSend }: { product: KaprukProduct, onSend?: (t: string) => void }) {
  const addToCart = useStore((s) => s.addToCart);
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const isWishlisted = useStore((s) => s.isWishlisted);
  const setSelectedProductDetails = useStore((s) => s.setSelectedProductDetails);
  const language = useStore((s) => s.language);
  const t = translations[language] || translations.en;

  const [addedToCart, setAddedToCart] = useState(false);
  const wishlisted = isWishlisted(product.id);

  const handleAdd = (e: React.MouseEvent) => {

    e.stopPropagation();
    addToCart(product);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1500);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product);
  };

  const handleCardClick = () => {
    setSelectedProductDetails(product);
  };

  return (
    <motion.div
      onClick={handleCardClick}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="w-[150px] sm:w-[180px] flex-none rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer group snap-start theme-t"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}
    >
      {/* Image */}
      <div className="relative h-36 sm:h-44 overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl sm:text-5xl">
            {getCategoryEmoji(product.category)}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Price */}
        <div className="absolute top-2 right-2 glass rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1">
          <span className="text-Kapruka-gold text-[10px] sm:text-[11px] font-bold drop-shadow-md">
            LKR {product.price?.toLocaleString()}
          </span>
        </div>

        {/* Wishlist */}
        <motion.button whileTap={{ scale: 0.75 }} onClick={handleWishlist}
          className="absolute top-2 left-2 p-1 sm:p-1.5 rounded-full glass transition-all duration-300">
          <Heart size={12} fill={wishlisted ? '#FF6B7D' : 'none'}
            className={wishlisted ? 'text-Kapruka-pink' : 'text-white/80'} />
        </motion.button>

        {/* Stock */}
        {product.in_stock ? (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold glass text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> In Stock
          </div>
        ) : (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white/70 text-[10px] sm:text-xs font-bold tracking-wider uppercase">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 sm:p-3 space-y-2 flex flex-col justify-between h-[95px] sm:h-[110px]">
        <div>
          <p className="text-[11px] sm:text-xs font-semibold leading-tight line-clamp-2" style={{ color: 'var(--text-primary)' }}>
            {product.name}
          </p>
          {product.rating && (
            <div className="flex items-center gap-0.5 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={8}
                  className={i < Math.round(product.rating!) ? 'text-Kapruka-gold fill-Kapruka-gold' : 'text-Kapruka-muted/30'} />
              ))}
              <span className="text-[9px] ml-0.5" style={{ color: 'var(--text-muted)' }}>{product.rating}</span>
            </div>
          )}
        </div>

        <div className="flex gap-1.5 mt-1">
          {/* View Details Button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedProductDetails(product);
            }}
            className="flex-none p-1.5 sm:p-2 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1 theme-t"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
            title={t.viewDetails}
          >
            <Eye size={12} />
            <span className="hidden sm:inline">{t.viewDetails}</span>
          </motion.button>

          {/* Add to Cart Button */}
          <motion.button whileTap={{ scale: 0.92 }} onClick={handleAdd} disabled={!product.in_stock}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-300 disabled:opacity-25 ${
              addedToCart ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'btn-primary rounded-lg text-white'
            }`}>
            {addedToCart ? <><Check size={11} /> {t.added}</> : <><ShoppingCart size={11} className="relative z-10" /> <span className="relative z-10">{t.addToCart}</span></>}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function getCategoryEmoji(cat?: string): string {
  const map: Record<string, string> = {
    cakes: '🎂', flowers: '💐', electronics: '⚡', groceries: '🛒',
    clothing: '👕', books: '📚', toys: '🧸',
  };
  return map[cat?.toLowerCase() ?? ''] ?? '🎁';
}
