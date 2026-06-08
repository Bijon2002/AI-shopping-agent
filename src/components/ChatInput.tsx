import { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';

export default function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Setup simple SpeechRecognition if supported
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US'; // Can capture Sinhala as well if changed, but defaults to browser language

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setText((prev) => (prev + ' ' + transcript).trim());
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

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
    if (!recognitionRef.current) {
      alert("Aney machan, Speech Recognition is not supported in this browser!");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  return (
    <form
      onSubmit={handleSend}
      className="flex-none px-6 py-4 bg-kado-dark border-t border-white/5 max-w-2xl w-full mx-auto flex items-center gap-3 relative"
    >
      <button
        type="button"
        onClick={toggleVoice}
        className={`flex-none p-3 rounded-xl border border-white/5 transition-all duration-300 ${
          isListening
            ? 'bg-kado-orange text-white animate-pulse'
            : 'bg-kado-surface text-white/60 hover:text-white hover:border-kado-orange/30'
        }`}
        title="Speak to KADO (Voice input)"
      >
        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
      </button>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        placeholder={disabled ? "KADO is thinking..." : "Type here machang..."}
        className="flex-1 px-4 py-3 bg-kado-surface border border-white/5 focus:border-kado-orange/40 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none transition-colors"
      />

      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="flex-none p-3 bg-kado-orange hover:bg-kado-orange/95 text-white rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95"
      >
        <Send size={18} />
      </button>
    </form>
  );
}
