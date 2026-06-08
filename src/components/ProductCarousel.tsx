import ProductCard from './ProductCard';
import type { KaprukProduct } from '../types';

export default function ProductCarousel({ products }: { products: KaprukProduct[] }) {
  if (!products || products.length === 0) return null;

  return (
    <div className="w-full relative mt-2">
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scroll-smooth pr-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {/* Decorative gradient fade to indicate scrollable content */}
      <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-kado-dark/50 to-transparent pointer-events-none" />
    </div>
  );
}
