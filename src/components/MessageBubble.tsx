import { motion } from 'framer-motion';
import { ExternalLink, CreditCard, CheckCircle } from 'lucide-react';
import ProductCarousel from './ProductCarousel';
import type { Message } from '../types';

export default function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-3 mb-6 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-kado-orange/20 border border-kado-orange/40 flex items-center justify-center flex-none shadow-lg">
          <span className="text-kado-orange text-sm font-bold font-display">K</span>
        </div>
      )}

      <div className={`max-w-[75%] space-y-3 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Message Text Bubble */}
        <div
          className={
            isUser
              ? 'bg-kado-orange text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-lg'
              : 'bg-kado-surface text-white/90 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/5 shadow-xl'
          }
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{msg.text}</p>
        </div>

        {/* Custom Pay Link Card if generated */}
        {msg.payLink && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-kado-card border border-kado-orange/30 rounded-2xl p-4 space-y-3 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 w-24 h-24 bg-kado-orange/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-2 text-kado-orange">
              <CreditCard size={18} />
              <span className="font-display font-bold text-sm">Secure Guest Checkout</span>
            </div>
            <p className="text-xs text-white/70">
              Your order is ready. Click the button below to complete payment securely on Kapruka.com.
            </p>
            <a
              href={msg.payLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-kado-orange to-amber-500 hover:from-kado-orange/95 hover:to-amber-500/95 text-white font-display font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform active:scale-95 group"
            >
              Pay via Kapruka
              <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </motion.div>
        )}

        {/* Order Confirmation Card if order created */}
        {msg.orderNumber && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-kado-surface border border-emerald-500/30 rounded-2xl p-4 space-y-2 shadow-2xl"
          >
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle size={18} />
              <span className="font-display font-bold text-sm">Order Created Successfully!</span>
            </div>
            <div className="bg-kado-card/50 rounded-xl p-3 border border-white/5">
              <span className="text-[10px] text-kado-muted block uppercase tracking-wider">Order Reference</span>
              <span className="font-display font-bold text-white text-base">#{msg.orderNumber}</span>
            </div>
            <p className="text-xs text-white/60">
              Track this order anytime by saying: <code className="text-kado-orange bg-kado-dark px-1.5 py-0.5 rounded text-[11px]">Track my order #{msg.orderNumber}</code>
            </p>
          </motion.div>
        )}

        {/* Inline Product Cards */}
        {msg.products && msg.products.length > 0 && (
          <ProductCarousel products={msg.products} />
        )}
      </div>
    </motion.div>
  );
}
