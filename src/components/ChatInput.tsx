import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, ImagePlus, X } from 'lucide-react';

export default function ChatInput({
  onSend, disabled, image, setImage,
}: {
  onSend: (text: string, image?: string) => void;
  disabled: boolean;
  image: string | null;
  setImage: (img: string | null) => void;
}) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = false; 
      rec.interimResults = false; 
      rec.lang = 'en-US';
      rec.onresult = (e: any) => { 
        const t = e.results[0][0].transcript; 
        if (t) setText(p => (p + ' ' + t).trim()); 
      };
      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert("Microphone access denied. Please allow microphone permissions in your browser.");
        } else if (event.error === 'network') {
          alert("Network error: The browser's speech recognition service is unreachable. This usually happens if a firewall/adblocker blocks it, or if you aren't using Chrome/Edge.");
        }
      };
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !image) || disabled) return;
    onSend(text.trim(), image || undefined);
    setText('');
    setImage(null);
  };

  const processImageFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // Scale down if image is too huge (optional, but helps with base64 size limits)
      let { width, height } = img;
      const MAX_SIZE = 1500;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF'; // ensure transparent backgrounds become white
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, width, height);
        setImage(canvas.toDataURL('image/jpeg', 0.8)); // always send JPEG
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      alert("Could not process this image format.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // reset input so same file can be selected again
    if (e.target) e.target.value = '';
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) { alert("Speech Recognition not supported!"); return; }
    if (isListening) recognitionRef.current.stop();
    else { setIsListening(true); recognitionRef.current.start(); }
  };

  return (
    <form onSubmit={handleSend}
      className={`flex-none px-3 sm:px-6 py-2.5 sm:py-4 max-w-2xl w-full mx-auto flex items-center gap-2 sm:gap-2.5 relative z-10 transition-all rounded-2xl border-2 border-transparent`}>

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
              className="absolute inset-0 rounded-lg sm:rounded-xl border-2 border-Kapruka-orange" />
          </>
        )}
      </motion.button>

      {/* Image Upload */}
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
      <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="flex-none p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300 disabled:opacity-50"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
        <ImagePlus size={16} />
      </motion.button>

      {/* Input & Image Preview Wrapper */}
      <div className={`flex-1 flex flex-col relative rounded-lg sm:rounded-xl transition-all duration-300 ${isFocused ? 'input-glow' : ''}`}>
        
        {/* Image Preview */}
        <AnimatePresence>
          {image && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="relative w-max mx-3 mt-3 mb-1">
              <img src={image} alt="Upload preview" className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-lg shadow-sm border" style={{ borderColor: 'var(--border-default)' }} />
              <button type="button" onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors z-20">
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
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
          placeholder={disabled ? "Kapruka is thinking..." : "Type here machang..."}
          className="w-full px-3 sm:px-4 py-3 sm:py-3.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm focus:outline-none relative z-10 transition-colors"
          style={{
            backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)',
            border: isFocused ? 'none' : '1px solid var(--border-default)',
          }}
        />
      </div>

      {/* Send */}
      <motion.button type="submit" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
        disabled={(!text.trim() && !image) || disabled}
        className="flex-none p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl transition-all duration-300 disabled:opacity-25 disabled:cursor-not-allowed shadow-lg"
        style={{
          background: (text.trim() || image) ? 'linear-gradient(135deg, #FF6B2B, #FF8F5C)' : 'var(--bg-surface)',
          color: (text.trim() || image) ? '#fff' : 'var(--text-muted)',
          boxShadow: (text.trim() || image) ? '0 8px 25px rgba(255,107,43,0.3)' : 'none',
          border: (text.trim() || image) ? 'none' : '1px solid var(--border-default)',
        }}>
        <Send size={16} />
      </motion.button>
    </form>
  );
}
