import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';
import { useStore } from '../store';
import { Sparkles, Calendar, Gift, Heart, Package, Trash2 } from 'lucide-react';
import { translations } from '../lib/translations';

interface QuickChip {
  label: string;
  prompt: string;
  icon: any;
  color: string;
  glow: string;
}

const QUICK_STARTS: QuickChip[] = [
  { label: 'Birthday Gift', prompt: 'I want to send a birthday gift to Colombo', icon: Gift, color: '#FF6B7D', glow: 'rgba(255,107,125,0.15)' },
  { label: 'Anniversary Flowers', prompt: 'Show me anniversary flower arrangements', icon: Sparkles, color: '#F5C518', glow: 'rgba(245,197,24,0.15)' },
  { label: 'Chocolate Cake', prompt: 'Find me a rich chocolate cake', icon: Calendar, color: '#10B981', glow: 'rgba(16,185,129,0.15)' },
  { label: 'Gift for Amma', prompt: 'Suggest a gift for my Amma under 3000 LKR', icon: Heart, color: '#A855F7', glow: 'rgba(168,85,247,0.15)' },
  { label: 'Track Order', prompt: 'Track my order VPAY827982BA', icon: Package, color: '#3B82F6', glow: 'rgba(59,130,246,0.15)' },
];

export default function MessageList({
  isLoading, currentToolName, onSend,
}: {
  isLoading: boolean;
  currentToolName: string | null;
  onSend: (text: string) => void;
}) {
  const { messages, clearMessages, language } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [greetingIndex, setGreetingIndex] = useState(0);
  const greetings = ['Welcome!', 'வணக்கம்!', 'ආයුබෝවන්!'];

  useEffect(() => {
    const interval = setInterval(() => {
      setGreetingIndex((prev) => (prev + 1) % greetings.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, currentToolName]);

  const userMessagesCount = messages.filter(m => m.role === 'user').length;

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-2">
      {userMessagesCount === 0 ? (
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
              <img src="/kado-logo.png" alt="Kapruka"
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
          <div className="space-y-1.5 sm:space-y-2">
            <div className="h-[32px] sm:h-[40px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.h2
                  key={greetingIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="font-display font-extrabold text-xl sm:text-2xl md:text-3xl tracking-tight leading-tight drop-shadow-md"
                  style={{ color: '#fad804' }}>
                  {greetings[greetingIndex]}
                </motion.h2>
              </AnimatePresence>
            </div>
            <div
              className="py-2 px-4 mx-auto transition-colors duration-500"
              style={{ maxWidth: 'fit-content' }}
            >
              <h3 className="font-display font-bold text-xs sm:text-sm leading-snug text-white">
                {translations[language]?.welcomeTitle || translations.en.welcomeTitle}
              </h3>
            </div>
          </div>

          {/* Active Voice/System connection status cards */}


          {/* Quick Start Chips */}
          <div className="w-full space-y-1.5 sm:space-y-2">
            <div
              className="inline-block px-3 py-1 rounded-lg backdrop-blur-md shadow-sm transition-colors duration-500"
              style={{ background: 'rgba(150, 150, 150, 0.2)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid var(--border-default)' }}
            >
              <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: 'var(--text-primary)' }}>
                ✨ Quick Start
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2.5 justify-center px-2">
              {QUICK_STARTS.map((chip, idx) => {
                const Icon = chip.icon;
                return (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSend(chip.prompt)}
                    className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-[11px] font-semibold transition-all duration-300 shadow-md"
                    style={{
                      background: 'rgba(24,24,27,0.85)',
                      border: `1px solid ${chip.color}40`,
                      color: '#ffffff',
                    }}
                  >
                    <Icon size={12} style={{ color: chip.color }} />
                    {chip.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

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

          {messages.filter(m => !m.text || !m.text.includes('Live buddy connected')).map((msg) => (
            <MessageBubble key={msg.id} msg={msg} onSend={onSend} />
          ))}

          {/* Loading */}
          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 sm:gap-3 mb-6">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-none animate-glow overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.25)' }}>
                <img src="/kado-logo.png" alt="Kapruka" className="w-full h-full object-cover" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 sm:px-5 py-3 sm:py-4 max-w-[75%] sm:max-w-[70%] theme-t shadow-lg"
                style={{ background: '#422a74', border: 'none', boxShadow: '0 8px 25px rgba(66,42,116,0.35)' }}>
                <div className="flex gap-1.5 items-center h-5">
                  {[0, 1, 2].map(i => (
                    <motion.span key={i}
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                      className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white" />
                  ))}
                </div>
                {currentToolName && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-[9px] sm:text-[10px] text-white font-bold uppercase tracking-wider block mt-2">
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
