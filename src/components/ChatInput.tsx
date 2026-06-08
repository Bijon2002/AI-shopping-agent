import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Mic, MicOff } from 'lucide-react';

export default function ChatInput({
  onSend, disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = false; rec.interimResults = false; rec.lang = 'en-US';
      rec.onresult = (e: any) => { const t = e.results[0][0].transcript; if (t) setText(p => (p + ' ' + t).trim()); };
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) { alert("Speech Recognition not supported!"); return; }
    if (isListening) recognitionRef.current.stop();
    else { setIsListening(true); recognitionRef.current.start(); }
  };

  return (
    <form onSubmit={handleSend}
      className="flex-none px-3 sm:px-6 py-2.5 sm:py-4 max-w-2xl w-full mx-auto flex items-center gap-2 sm:gap-2.5 relative z-10">

      {/* Voice */}
      <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={toggleVoice}
        className="flex-none p-2.5 sm:p-3 rounded-lg sm:rounded-xl relative transition-all duration-300"
        style={isListening
          ? { background: 'linear-gradient(135deg, #FF6B2B, #FF8F5C)', color: '#fff' }
          : { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }
        }>
        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        {isListening && (
          <>
            <motion.span animate={{ scale: [1, 1.8], opacity: [0.5, 0] }} transition={{ duration: 1.2, repeat: Infinity }}
              className="absolute inset-0 rounded-lg sm:rounded-xl border-2 border-kado-orange" />
          </>
        )}
      </motion.button>

      {/* Input */}
      <div className={`flex-1 relative rounded-lg sm:rounded-xl transition-all duration-300 ${isFocused ? 'input-glow' : ''}`}>
        {isFocused && (
          <div className="absolute inset-[-1px] rounded-lg sm:rounded-xl z-0"
            style={{
              background: 'linear-gradient(135deg, #FF6B2B, #F5C518, #A855F7, #FF6B2B)',
              backgroundSize: '300% 300%', animation: 'gradient-x 3s ease infinite', opacity: 0.6,
            }} />
        )}
        <input type="text" value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={disabled ? "KADO is thinking..." : "Type here machang..."}
          className="w-full px-3 sm:px-4 py-3 sm:py-3.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm focus:outline-none relative z-10 transition-colors"
          style={{
            backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)',
            border: isFocused ? 'none' : '1px solid var(--border-default)',
          }}
        />
      </div>

      {/* Send */}
      <motion.button type="submit" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
        disabled={!text.trim() || disabled}
        className="flex-none p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl transition-all duration-300 disabled:opacity-25 disabled:cursor-not-allowed shadow-lg"
        style={{
          background: text.trim() ? 'linear-gradient(135deg, #FF6B2B, #FF8F5C)' : 'var(--bg-surface)',
          color: text.trim() ? '#fff' : 'var(--text-muted)',
          boxShadow: text.trim() ? '0 8px 25px rgba(255,107,43,0.3)' : 'none',
          border: text.trim() ? 'none' : '1px solid var(--border-default)',
        }}>
        <Send size={16} />
      </motion.button>
    </form>
  );
}
