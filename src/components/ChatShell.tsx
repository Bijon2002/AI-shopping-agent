import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import CartDrawer from './CartDrawer';
import { useStore } from '../store';
import { sendMessage } from '../lib/openrouter';
import { detectOccasion, getSystemContextNote } from '../lib/occasion-engine';

export default function ChatShell() {
  const {
    messages,
    addMessage,
    updateLastAssistant,
    cart,
    cartOpen,
    setCartOpen,
    detectedOccasion,
    setDetectedOccasion
  } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [currentToolName, setCurrentToolName] = useState<string | null>(null);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleSendMessage = async (text: string) => {
    // 1. Add user message
    const userMsgId = Date.now().toString();
    addMessage({
      id: userMsgId,
      role: 'user',
      text: text,
    });

    setIsLoading(true);
    setCurrentToolName(null);

    // 2. Scan for occasions
    const occasion = detectOccasion(text);
    if (occasion) {
      setDetectedOccasion(occasion.name);
    }

    // 3. Create dummy assistant message for typing/streaming target
    const assistantMsgId = (Date.now() + 1).toString();
    addMessage({
      id: assistantMsgId,
      role: 'assistant',
      text: '',
    });

    // 4. Build message payload for OpenRouter
    // We inject occasion notes into the messages if detected
    const historyPayload = messages.map(m => ({
      role: m.role,
      content: m.text
    }));
    
    // Append the latest user message
    historyPayload.push({
      role: 'user',
      content: text
    });

    if (occasion) {
      historyPayload.push({
        role: 'user',
        content: getSystemContextNote(occasion)
      });
    }

    let accumulatedResponse = '';

    try {
      await sendMessage(
        historyPayload,
        // onChunk callback
        (chunk) => {
          accumulatedResponse += chunk;
          updateLastAssistant(accumulatedResponse);
        },
        // onProducts callback (when MCP returns product search lists)
        (products) => {
          updateLastAssistant(accumulatedResponse, products);
        },
        // onPayLink callback
        (payUrl) => {
          updateLastAssistant(accumulatedResponse, undefined, payUrl);
        },
        // onOrderConfirm callback
        (orderNo) => {
          updateLastAssistant(accumulatedResponse, undefined, undefined, orderNo);
        },
        // onToolStart
        (toolName) => {
          setCurrentToolName(toolName);
        },
        // onToolEnd
        () => {
          setCurrentToolName(null);
        }
      );
    } catch (err: any) {
      accumulatedResponse = `Aney machang, I hit a snag: ${err.message || 'connection failed'}. Please try again!`;
      updateLastAssistant(accumulatedResponse);
    } finally {
      setIsLoading(false);
      setCurrentToolName(null);
    }
  };

  return (
    <div className="h-screen w-screen bg-kado-dark flex flex-col relative overflow-hidden">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-kado-orange/5 blur-[120px] animate-pulse-soft" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-purple-900/10 blur-[120px] animate-pulse-soft" />
      </div>

      {/* Header */}
      <header className="flex-none px-6 py-4 flex items-center justify-between border-b border-white/5 z-10 bg-kado-dark/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-kado-orange to-amber-500 flex items-center justify-center shadow-lg">
            <span className="text-white text-base font-bold font-display">K</span>
          </div>
          <div>
            <h1 className="text-white font-display font-extrabold text-sm tracking-wide">KADO</h1>
            <p className="text-kado-muted text-[10px] uppercase font-bold tracking-widest">
              {detectedOccasion ? `Mode: ${detectedOccasion}` : 'Kapruka AI Discovery Oracle'}
            </p>
          </div>
        </div>

        {/* Cart Button */}
        <button
          onClick={() => setCartOpen(true)}
          className="relative p-2.5 bg-kado-surface hover:bg-white/5 border border-white/5 hover:border-kado-orange/30 rounded-xl text-white transition-all duration-300 transform active:scale-95 shadow-md flex items-center gap-1.5"
        >
          <ShoppingCart size={16} />
          {cartCount > 0 && (
            <span className="flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold bg-kado-orange text-white rounded-full min-w-[16px]">
              {cartCount}
            </span>
          )}
        </button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-hidden flex flex-col z-10">
        <MessageList isLoading={isLoading} currentToolName={currentToolName} />
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </main>

      {/* Cart drawer */}
      <AnimatePresence>
        {cartOpen && <CartDrawer />}
      </AnimatePresence>
    </div>
  );
}
