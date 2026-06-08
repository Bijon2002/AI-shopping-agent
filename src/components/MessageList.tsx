import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import MessageBubble from './MessageBubble';
import { useStore } from '../store';
import { Sparkles, Calendar, Gift, Heart, Package, Trash2 } from 'lucide-react';

interface QuickChip {
  label: string;
  prompt: string;
  icon: any;
  color: string;
  glow: string;
}

const QUICK_STARTS: QuickChip[] = [
  { label: 'Birthday Gift', prompt: 'I want to send a birthday gift to Colombo', icon: Gift, color: '#FF6B7D', glow: 'rgba(255,107,125,0.15)' },
  { label: 'Vesak Lanterns', prompt: 'Show me Vesak flowers or lanterns', icon: Sparkles, color: '#F5C518', glow: 'rgba(245,197,24,0.15)' },
  { label: 'Avurudu Hamper', prompt: 'Find me an Avurudu sweet hamper', icon: Calendar, color: '#10B981', glow: 'rgba(16,185,129,0.15)' },
  { label: 'Gift for Amma', prompt: 'Suggest a gift for my Amma under 3000 LKR', icon: Heart, color: '#A855F7', glow: 'rgba(168,85,247,0.15)' },
  { label: 'Track Order', prompt: 'Track my order #12345', icon: Package, color: '#3B82F6', glow: 'rgba(59,130,246,0.15)' },
];

export default function MessageList({
  isLoading, currentToolName, onSend,
}: {
  isLoading: boolean;
  currentToolName: string | null;
  onSend: (text: string) => void;
}) {
  const { messages, clearMessages } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, currentToolName]);

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-2">
      {messages.length === 0 ? (
        /* ═══ WELCOME SCREEN ═══ */
        <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3 sm:space-y-4 animate-fade-in">

          {/* Logo with glow rings */}
          <div className="p-4 sm:p-5 animate-float">
            <div className="relative w-16 h-16 sm:w-[72px] sm:h-[72px]">
              <div className="absolute inset-[-10px] sm:inset-[-12px] rounded-3xl opacity-40"
                style={{
                  background: 'conic-gradient(from 0deg, #FF6B2B, #F5C518, #A855F7, #3B82F6, #10B981, #FF6B2B)',
                  filter: 'blur(18px)',
                  animation: 'spinSlow 8s linear infinite',
                }}
              />
              <div className="absolute inset-[-5px] sm:inset-[-6px] rounded-2xl"
                style={{
                  background: 'conic-gradient(from 180deg, #FF6B2B, #F5C518, #A855F7, #FF6B2B)',
                  borderRadius: '20px',
                  animation: 'spinSlow 6s linear infinite reverse',
                  opacity: 0.3,
                }}
              />
              <img src="/kado-logo.png" alt="KADO"
                className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl object-cover shadow-2xl z-10"
              />
              <motion.div
                animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center z-20"
                style={{ background: 'linear-gradient(135deg, #F5C518, #FF6B2B)' }}
              >
                <Sparkles size={10} className="text-white" />
              </motion.div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1 sm:space-y-1.5">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl md:text-3xl tracking-tight gradient-text leading-tight">
              Ayubowan!
            </h2>
            <h3 className="font-display font-bold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
              I am <span className="gradient-text">KADO</span>, your Sri Lankan shopping companion
            </h3>
            <p className="text-[11px] sm:text-xs leading-relaxed max-w-xs sm:max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Tell me what you need — gifts, cakes, flowers, electronics — and I'll find the perfect item on Kapruka & deliver it anywhere in Sri Lanka! 🇱🇰
            </p>
          </div>

          {/* Quick Start Chips */}
          <div className="w-full space-y-1.5 sm:space-y-2">
            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: 'var(--text-muted)' }}>
              ✨ Quick Start
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2.5 justify-center px-2">
              {QUICK_STARTS.map((chip, idx) => {
                const Icon = chip.icon;
                return (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSend(chip.prompt)}
                    className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-[11px] font-semibold transition-all duration-300 shadow-md theme-t"
                    style={{
                      background: chip.glow,
                      border: `1px solid ${chip.color}30`,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Icon size={12} style={{ color: chip.color }} />
                    {chip.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <p className="text-[8px] sm:text-[9px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            Powered by Kapruka • Made with ❤️ in Sri Lanka
          </p>
        </div>
      ) : (
        /* ═══ MESSAGES ═══ */
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center mb-3">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={clearMessages}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all theme-t"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
              <Trash2 size={10} /> New Chat
            </motion.button>
          </div>

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {/* Loading */}
          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 sm:gap-3 mb-6">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-none animate-glow overflow-hidden"
                style={{ border: '1px solid rgba(255,107,43,0.25)' }}>
                <img src="/kado-logo.png" alt="KADO" className="w-full h-full object-cover" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 sm:px-5 py-3 sm:py-4 max-w-[75%] sm:max-w-[70%] theme-t"
                style={{ background: 'var(--bubble-assistant-bg)', border: '1px solid var(--bubble-assistant-border)' }}>
                <div className="flex gap-1.5 items-center h-5">
                  {[0, 1, 2].map(i => (
                    <motion.span key={i}
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                      className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-kado-orange" />
                  ))}
                </div>
                {currentToolName && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-[9px] sm:text-[10px] text-kado-orange font-bold uppercase tracking-wider block mt-2">
                    ⚡ {currentToolName.replace('kapruka_', '').replaceAll('_', ' ')}…
                  </motion.span>
                )}
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
