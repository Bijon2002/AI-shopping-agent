import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { useStore } from '../store';
import { Sparkles, Calendar, Gift, Heart, Coffee } from 'lucide-react';

interface QuickStartChip {
  label: string;
  prompt: string;
  icon: any;
}

const QUICK_STARTS: QuickStartChip[] = [
  { label: 'Birthday Gift', prompt: 'I want to send a birthday gift to Colombo', icon: Gift },
  { label: 'Vesak Lanterns', prompt: 'Show me Vesak flowers or lanterns', icon: Sparkles },
  { label: 'Avurudu Hamper', prompt: 'Find me an Avurudu sweet hamper', icon: Calendar },
  { label: 'Gift for Amma', prompt: 'Suggest a gift for my Amma under 3000 LKR', icon: Heart },
  { label: 'Track Order', prompt: 'Track my order #12345', icon: Coffee },
];

export default function MessageList({
  isLoading,
  currentToolName,
}: {
  isLoading: boolean;
  currentToolName: string | null;
}) {
  const { messages, addMessage } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, currentToolName]);

  const handleQuickStartClick = (prompt: string) => {
    addMessage({
      id: Date.now().toString(),
      role: 'user',
      text: prompt,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6 animate-fade-in">
          {/* Logo element with gold-orange glow */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-kado-orange to-amber-500 flex items-center justify-center shadow-2xl relative">
            <span className="text-white text-3xl font-display font-extrabold tracking-wider">K</span>
            <div className="absolute inset-0 rounded-full border border-kado-orange/30 animate-ping opacity-75" />
          </div>

          <div className="space-y-2">
            <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
              Ayubowan! I am KADO
            </h2>
            <p className="text-sm text-white/70 leading-relaxed font-body">
              Your Sri Lankan AI Shopping Companion. Tell me what you need, where to send it, and let's discover the perfect gift on Kapruka!
            </p>
          </div>

          {/* Quick Start Suggestions */}
          <div className="w-full space-y-3 pt-4">
            <p className="text-[11px] uppercase tracking-wider text-kado-muted font-bold">
              Try asking me about
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_STARTS.map((chip, idx) => {
                const Icon = chip.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleQuickStartClick(chip.prompt)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-kado-surface/50 hover:bg-kado-surface border border-white/5 hover:border-kado-orange/30 text-xs text-white/80 hover:text-kado-orange rounded-full transition-all duration-300 transform active:scale-95 shadow-md"
                  >
                    <Icon size={12} />
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {/* Loading Animation / Tool Executing State */}
          {isLoading && (
            <div className="flex gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-kado-orange/20 border border-kado-orange/40 flex items-center justify-center flex-none">
                <span className="text-kado-orange text-sm font-bold font-display animate-pulse">K</span>
              </div>
              <div className="bg-kado-surface text-white/90 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/5 shadow-xl flex flex-col gap-2 max-w-[70%]">
                <div className="flex items-center gap-2">
                  {/* Bouncing dots typing indicator */}
                  <div className="flex gap-1.5 items-center py-1">
                    <span className="w-2.5 h-2.5 bg-kado-orange rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2.5 h-2.5 bg-kado-orange rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2.5 h-2.5 bg-kado-orange rounded-full animate-bounce" />
                  </div>
                </div>
                {currentToolName && (
                  <span className="text-[11px] text-kado-orange font-bold uppercase tracking-wider animate-pulse">
                    ⚡ {currentToolName.replace('kapruka_', '').replace('_', ' ')}...
                  </span>
                )}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
