import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, ImagePlus, X } from 'lucide-react';

import { useStore } from '../store';
import { Headphones } from 'lucide-react';
import { toast } from 'react-hot-toast';

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

  const { messages, voiceModeOpen, setVoiceModeOpen, cart } = useStore();
  const alreadyHasImage = messages.some(m => m.image);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !image) || disabled) return;
    onSend(text.trim(), image || undefined);
    setText('');
    setImage(null);
  };

  const processImageFile = (file: File) => {
    if (alreadyHasImage) {
      toast.error("Only one image can be uploaded for one chat session!");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
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
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, width, height);
        setImage(canvas.toDataURL('image/jpeg', 0.8));
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
    if (e.target) e.target.value = '';
  };

  const toggleVoice = () => {
    // Prevent conflict with Gemini Live voice mode which uses the microphone.
    if (voiceModeOpen) {
      alert('Close Gemini Live Voice Buddy before using voice dictation.');
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Speech Recognition not supported in this browser. Try Chrome!'); return; }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { console.error(e); }
      }
      setIsListening(false);
    } else {
      // Request microphone permission first
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          setIsListening(true);
          const rec = new SR();
          rec.continuous = false;
          rec.interimResults = false;
          rec.lang = 'en-US';

          rec.onresult = (e: any) => {
            const t = e.results[0][0].transcript;
            if (t) setText(p => (p + ' ' + t).trim());
          };

          rec.onerror = (event: any) => {
            console.error('[ChatInput] Speech recognition error:', event.error);
            setIsListening(false);
          };

          rec.onend = () => {
            setIsListening(false);
            recognitionRef.current = null;
          };

          recognitionRef.current = rec;
          try { rec.start(); } catch (err) {
            console.error('[ChatInput] Speech recognition start failed:', err);
            setIsListening(false);
          }
        })
        .catch(err => {
          console.error('[ChatInput] Microphone permission denied:', err);
          alert('Microphone access is required for voice dictation. Please allow microphone permissions.');
        });
    }
  };

  const handleImageClick = () => {
    if (alreadyHasImage) {
      toast.error("Only one image can be uploaded for one chat session!");
      return;
    }
    fileInputRef.current?.click();
  };

  const lastAsstMsg = messages.filter(m => m.role === 'assistant').pop()?.text?.toLowerCase() || '';
  const isCheckingOut = lastAsstMsg.includes('where should i send it') || lastAsstMsg.includes('delivery date') || lastAsstMsg.includes('proceed to checkout');
  const disableCheckout = disabled || cart.length === 0 || isCheckingOut;

  return (
    <form onSubmit={handleSend}
      className={`flex-none px-3 sm:px-6 py-2.5 sm:py-4 max-w-2xl w-full mx-auto flex items-center gap-2 sm:gap-2.5 relative z-10 transition-all rounded-2xl border-2 border-transparent`}>

      {/* Gemini Live Voice Mode button */}
      <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => setVoiceModeOpen(!voiceModeOpen)}
        title="Open Gemini Live Voice Buddy"
        className="flex-none p-2.5 sm:p-3 rounded-lg sm:rounded-xl relative transition-all duration-300"
        style={voiceModeOpen
          ? { background: 'linear-gradient(135deg, #A855F7, #EC4899)', color: '#fff' }
          : { background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(8px)', color: '#422a74' }
        }>
        {voiceModeOpen && <span className="absolute inset-0 rounded-lg sm:rounded-xl bg-purple-500/20 animate-ping pointer-events-none" />}
        <Headphones size={16} />
      </motion.button>

      {/* Local STT Voice typing */}
      <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={toggleVoice}
        title="Voice Dictation"
        className="flex-none p-2.5 sm:p-3 rounded-lg sm:rounded-xl relative transition-all duration-300"
        style={isListening
          ? { background: 'linear-gradient(135deg, #FF6B2B, #FF8F5C)', color: '#fff' }
          : { background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(8px)', color: '#422a74' }
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
      <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={handleImageClick}
        disabled={disabled}
        title="Upload Image"
        className={`flex-none p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300 disabled:opacity-50 ${alreadyHasImage ? 'opacity-30' : ''}`}
        style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(8px)', color: '#422a74' }}>
        <ImagePlus size={16} />
      </motion.button>

      {/* Checkout Cart */}
      <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => onSend('checkout cart')}
        disabled={disableCheckout}
        title="Checkout Cart"
        className={`flex-none px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-[11px] sm:text-[12px] font-bold uppercase tracking-wider transition-all duration-300 disabled:opacity-50 ${cart.length === 0 ? 'opacity-30' : ''}`}
        style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(8px)', color: '#422a74' }}>
        Cart Checkout
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
              background: 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4), rgba(255,255,255,0.8))',
              backgroundSize: '300% 300%', animation: 'gradient-x 3s ease infinite', opacity: 0.6,
            }} />
        )}
        <input type="text" value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={disabled ? "Kapruka is thinking..." : "Ask Kapruka anything..."}
          className="w-full px-3 sm:px-4 py-3 sm:py-3.5 rounded-lg sm:rounded-xl text-[13px] sm:text-sm focus:outline-none relative z-10 transition-colors placeholder-white/70"
          style={{
            backgroundColor: 'rgba(150, 150, 150, 0.2)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: '#ffffff',
            border: isFocused ? '1px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.4)',
          }}
        />
      </div>

      {/* Send */}
      <motion.button type="submit" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
        disabled={(!text.trim() && !image) || disabled}
        className="flex-none p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl transition-all duration-300 disabled:opacity-25 disabled:cursor-not-allowed shadow-lg"
        style={{
          background: '#ffffff',
          backdropFilter: (text.trim() || image) ? 'none' : 'blur(8px)',
          color: '#422a74',
          boxShadow: (text.trim() || image) ? '0 8px 25px rgba(255,255,255,0.3)' : 'none',
          border: 'none',
        }}>
        <Send size={16} />
      </motion.button>
    </form>
  );
}
