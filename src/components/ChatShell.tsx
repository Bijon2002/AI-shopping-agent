import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart, Sun, Moon, Heart } from 'lucide-react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import CartDrawer from './CartDrawer';
import { useStore } from '../store';
import { useTheme } from './ThemeProvider';
import { sendMessage } from '../lib/openrouter';
import { detectOccasion, getSystemContextNote } from '../lib/occasion-engine';

export default function ChatShell() {
  const {
    messages, addMessage, updateLastAssistant,
    cart, cartOpen, setCartOpen, wishlist,
    detectedOccasion, setDetectedOccasion
  } = useStore();

  const { isDark, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [currentToolName, setCurrentToolName] = useState<string | null>(null);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const wishlistCount = wishlist.length;
  const isWelcome = messages.length === 0 && !isLoading;

  const handleSendMessage = async (text: string) => {
    addMessage({ id: Date.now().toString(), role: 'user', text });
    setIsLoading(true);
    setCurrentToolName(null);

    const occasion = detectOccasion(text);
    if (occasion) setDetectedOccasion(occasion.name);

    addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', text: '' });

    const historyPayload = messages.map(m => ({ role: m.role, content: m.text }));
    historyPayload.push({ role: 'user', content: text });
    if (occasion) historyPayload.push({ role: 'user', content: getSystemContextNote(occasion) });

    let acc = '';
    try {
      await sendMessage(
        historyPayload,
        (chunk) => { acc += chunk; updateLastAssistant(acc); },
        (products) => { updateLastAssistant(acc, products); },
        (payUrl) => { updateLastAssistant(acc, undefined, payUrl); },
        (orderNo) => { updateLastAssistant(acc, undefined, undefined, orderNo); },
        (toolName) => { setCurrentToolName(toolName); },
        () => { setCurrentToolName(null); }
      );
    } catch (err: any) {
      acc = `Aney machang, I hit a snag: ${err.message || 'connection failed'}. Please try again!`;
      updateLastAssistant(acc);
    } finally {
      setIsLoading(false);
      setCurrentToolName(null);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>

      {/* ═══ Video Background (welcome screen only) ═══ */}
      {isWelcome && (
        <div className="absolute inset-0 z-0">
          <video
            autoPlay muted loop playsInline
            className="w-full h-full object-cover"
            src="/bg.mp4"
          />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0" style={{
            background: isDark
              ? 'rgba(9,9,11,0.75)'
              : 'rgba(250,250,250,0.8)',
          }} />
        </div>
      )}

      {/* ═══ Aurora orbs (chat mode only) ═══ */}
      {!isWelcome && (
        <div className="aurora-bg">
          <div className="aurora-orb"
            style={{ width: '500px', height: '500px', top: '-15%', left: '15%',
              background: isDark ? 'radial-gradient(circle, rgba(255,107,43,0.1) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(255,107,43,0.06) 0%, transparent 70%)',
              animationDuration: '8s',
            }} />
          <div className="aurora-orb"
            style={{ width: '400px', height: '400px', bottom: '-10%', right: '10%',
              background: isDark ? 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(168,85,247,0.04) 0%, transparent 70%)',
              animationDuration: '10s', animationDelay: '-3s',
            }} />
        </div>
      )}

      {/* ═══ Header ═══ */}
      <header className="flex-none px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between z-20 glass relative gradient-border-bottom">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src="/kado-logo.png" alt="KADO" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl object-cover shadow-xl animate-glow" />
          <div>
            <h1 className="font-display font-extrabold text-sm sm:text-base tracking-wide gradient-text leading-none">KADO</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {detectedOccasion ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="text-[8px] sm:text-[9px] uppercase font-bold tracking-widest px-1.5 sm:px-2 py-0.5 rounded-full bg-kado-orange/15 text-kado-orange border border-kado-orange/20">
                  {detectedOccasion} Mode
                </motion.span>
              ) : (
                <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-widest hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
                  Smart Shopping Oracle
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Theme Toggle */}
          <button onClick={toggleTheme}
            className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-500 hover:scale-110 active:scale-90 theme-t"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="relative w-4 h-4">
              <Sun size={16} className={`absolute inset-0 transition-all duration-500 text-amber-400 ${isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
              <Moon size={16} className={`absolute inset-0 transition-all duration-500 text-blue-300 ${isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} />
            </div>
          </button>

          {/* Wishlist */}
          {wishlistCount > 0 && (
            <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl relative theme-t"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <Heart size={16} className="text-kado-pink" fill="#FF6B7D" />
              <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[8px] font-bold bg-kado-pink text-white rounded-full">{wishlistCount}</span>
            </motion.button>
          )}

          {/* Cart */}
          <button onClick={() => setCartOpen(true)}
            className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl relative flex items-center gap-1 sm:gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95 theme-t"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <ShoppingCart size={16} style={{ color: 'var(--text-primary)' }} />
            {cartCount > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold bg-kado-orange text-white rounded-full min-w-[16px]">
                {cartCount}
              </motion.span>
            )}
          </button>
        </div>
      </header>

      {/* ═══ Chat Area ═══ */}
      <main className="flex-1 overflow-hidden flex flex-col z-10 relative">
        <MessageList isLoading={isLoading} currentToolName={currentToolName} onSend={handleSendMessage} />
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </main>

      <AnimatePresence>
        {cartOpen && <CartDrawer />}
      </AnimatePresence>
    </div>
  );
}
