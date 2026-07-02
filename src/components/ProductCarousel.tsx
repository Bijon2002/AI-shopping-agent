import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';
import type { KaprukProduct } from '../types';

export default function ProductCarousel({ products }: { products: KaprukProduct[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  if (!products || products.length === 0) return null;

  const check = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, [products]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  return (
    <div className="w-full relative mt-3 group/carousel">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-3 scroll-smooth snap-x pr-4"
        style={{ scrollbarWidth: 'none' }}
      >
        {products.map((p, idx) => (
          <ProductCard key={p.id || `product-${idx}`} product={p} />
        ))}
      </div>

      {/* Arrows */}
      <AnimatePresence>
        {canLeft && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-9 h-9 rounded-full flex items-center justify-center z-10 glass shadow-xl opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 hover:scale-110"
          >
            <ChevronLeft size={18} style={{ color: 'var(--text-primary)' }} />
          </motion.button>
        )}
        {canRight && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-9 h-9 rounded-full flex items-center justify-center z-10 glass shadow-xl opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 hover:scale-110"
          >
            <ChevronRight size={18} style={{ color: 'var(--text-primary)' }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Fade edges */}
      {canLeft && <div className="absolute left-0 top-0 bottom-3 w-10 pointer-events-none z-[5]" style={{ background: 'linear-gradient(to right, var(--bg-base), transparent)' }} />}
      {canRight && <div className="absolute right-0 top-0 bottom-3 w-10 pointer-events-none z-[5]" style={{ background: 'linear-gradient(to left, var(--bg-base), transparent)' }} />}

      {/* Count */}
      {products.length > 2 && (
        <p className="text-center mt-1 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
          {products.length} items found
        </p>
      )}
    </div>
  );
}
