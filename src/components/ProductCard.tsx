import { motion } from 'framer-motion';
import { ShoppingCart, Star } from 'lucide-react';
import { useStore } from '../store';
import type { KaprukProduct } from '../types';

export default function ProductCard({ product }: { product: KaprukProduct }) {
  const addToCart = useStore((s) => s.addToCart);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="w-48 flex-none bg-kado-card border border-white/5 rounded-2xl overflow-hidden cursor-pointer group shadow-xl"
    >
      {/* Product image */}
      <div className="relative h-40 bg-kado-surface overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">{getCategoryEmoji(product.category)}</span>
          </div>
        )}

        {/* Price badge */}
        <div className="absolute top-2 right-2 bg-kado-dark/80 backdrop-blur-sm rounded-full px-2 py-0.5">
          <span className="text-kado-gold text-xs font-bold">
            LKR {product.price?.toLocaleString()}
          </span>
        </div>

        {/* Out of stock overlay */}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white/60 text-xs font-bold tracking-wider">OUT OF STOCK</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2 flex flex-col justify-between h-[100px]">
        <div>
          <p className="text-white text-xs font-medium leading-tight line-clamp-2">
            {product.name}
          </p>
          {product.rating && (
            <div className="flex items-center gap-1 mt-1">
              <Star size={10} className="text-kado-gold fill-kado-gold" />
              <span className="text-kado-muted text-xs">{product.rating}</span>
            </div>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={!product.in_stock}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-kado-orange/10 hover:bg-kado-orange/20 border border-kado-orange/30 hover:border-kado-orange/60 rounded-lg transition-all duration-200 text-kado-orange text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShoppingCart size={12} />
          Add to Cart
        </button>
      </div>
    </motion.div>
  );
}

function getCategoryEmoji(cat?: string): string {
  const map: Record<string, string> = {
    cakes: '🎂',
    flowers: '💐',
    electronics: '⚡',
    groceries: '🛒',
    clothing: '👕',
    books: '📚',
    toys: '🧸',
  };
  return map[cat?.toLowerCase() ?? ''] ?? '🎁';
}
