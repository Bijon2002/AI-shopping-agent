import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Volume2 } from 'lucide-react';

export default function VoiceMode({ 
  onClose, 
  onSend 
}: { 
  onClose: () => void; 
  onSend: (text: string, image?: string, onFinish?: (finalText: string) => void) => void;
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [displayTranscript, setDisplayTranscript] = useState('');
  const [networkError, setNetworkError] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef(''); // ← ref so onend closure always sees latest value
  const isThinkingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isPausedRef = useRef(false);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    transcriptRef.current = '';
    setDisplayTranscript('');
    try { recognitionRef.current.start(); } catch (e) {}
  }, []);

  const speakResponse = useCallback((text: string) => {
    const clean = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    if (!clean) {
      setTimeout(startListening, 400);
      return;
    }

    setIsSpeaking(true);
    isSpeakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(clean);
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en-GB'));
    if (preferred) utterance.voice = preferred;
    utterance.rate = 1.1;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      if (!isPausedRef.current) {
        setTimeout(startListening, 400);
      }
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    };

    window.speechSynthesis.speak(utterance);
  }, [startListening]);

  const submitTranscript = useCallback((text: string) => {
    if (!text.trim() || isThinkingRef.current) return;
    
    setIsThinking(true);
    isThinkingRef.current = true;
    setDisplayTranscript('');
    transcriptRef.current = '';

    onSend(text.trim(), undefined, (finalText: string) => {
      setIsThinking(false);
      isThinkingRef.current = false;
      speakResponse(finalText);
    });
  }, [onSend, speakResponse]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Speech Recognition not supported in this browser. Try Chrome!');
      onClose();
      return;
    }

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => setIsListening(true);

    rec.onresult = (e: any) => {
      let full = '';
      for (let i = 0; i < e.results.length; i++) {
        full += e.results[i][0].transcript;
      }
      transcriptRef.current = full; // ← always update ref immediately
      setDisplayTranscript(full);
    };

    rec.onend = () => {
      setIsListening(false);
      // Use ref — state would be stale in this closure
      const captured = transcriptRef.current.trim();
      if (captured && !isThinkingRef.current && !isPausedRef.current) {
        submitTranscript(captured);
      } else if (!captured && !isThinkingRef.current && !isSpeakingRef.current && !isPausedRef.current) {
        // Empty result — restart listening
        setTimeout(() => {
          try { rec.start(); } catch (e) {}
        }, 300);
      }
    };

    rec.onerror = (e: any) => {
      setIsListening(false);
      if (e.error === 'aborted' || e.error === 'no-speech') {
        // Harmless — restart
        if (!isThinkingRef.current && !isPausedRef.current) {
          setTimeout(() => { try { rec.start(); } catch (_) {} }, 500);
        }
        return;
      }
      if (e.error === 'network') {
        setNetworkError(true);
        console.warn('[VoiceMode] Speech API network error — requires internet + Chrome/Edge.');
        return;
      }
      console.warn('[VoiceMode] Speech error:', e.error);
    };

    recognitionRef.current = rec;

    // Start listening immediately
    setTimeout(() => {
      try { rec.start(); } catch (e) {}
    }, 500);

    return () => {
      try { rec.stop(); } catch (e) {}
      window.speechSynthesis.cancel();
    };
  }, [onClose, submitTranscript]);

  const handleInterrupt = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setTimeout(startListening, 300);
  };

  const toggleMic = () => {
    if (isListening) {
      isPausedRef.current = true;
      setIsPaused(true);
      try { recognitionRef.current?.stop(); } catch (e) {}
    } else if (isPaused) {
      isPausedRef.current = false;
      setIsPaused(false);
      if (isSpeakingRef.current) handleInterrupt();
      else startListening();
    } else {
      startListening();
    }
  };

  const status = isThinking ? 'Thinking...' 
    : isSpeaking ? 'Speaking...' 
    : isListening ? 'Listening...' 
    : isPaused ? 'Paused — tap to resume' 
    : 'Tap to speak';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Background */}
      <div className="absolute inset-0 backdrop-blur-3xl bg-black/40 z-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-orange-900/10 z-0" />

      {/* Close */}
      <button 
        onClick={() => { window.speechSynthesis.cancel(); try { recognitionRef.current?.stop(); } catch(e) {} onClose(); }}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50"
      >
        <X size={24} />
      </button>

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg px-8">
        
        {/* Status */}
        <h2 className="font-display text-2xl font-bold text-white mb-12 text-center">
          {networkError ? '🌐 No internet access to speech servers' : status}
        </h2>
        {networkError && (
          <p className="text-white/60 text-sm text-center mb-6 max-w-xs">
            Voice input requires Chrome/Edge with internet.<br/>You can still type below. 💬
          </p>
        )}

        {/* Orb */}
        <div className="relative w-48 h-48 mb-16" onClick={toggleMic}>
          <motion.div 
            animate={
              isSpeaking ? { scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] } :
              isListening ? { scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] } :
              { scale: 1, opacity: 0.1 }
            }
            transition={{ duration: isSpeaking ? 1.5 : 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-[-20px] rounded-full blur-2xl"
            style={{ background: isSpeaking ? '#A855F7' : isListening ? '#FF6B2B' : '#6B7280' }}
          />
          <motion.div 
            animate={
              isSpeaking ? { scale: [1, 1.2, 1] } :
              isListening ? { scale: [1, 1.05, 1] } :
              { scale: 1 }
            }
            transition={{ duration: isSpeaking ? 0.8 : 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="relative w-full h-full rounded-full flex items-center justify-center shadow-2xl cursor-pointer"
            style={{ 
              background: isSpeaking ? 'linear-gradient(135deg, #A855F7, #EC4899)' : 
                          isListening ? 'linear-gradient(135deg, #FF6B2B, #F5C518)' : 
                          isThinking ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' :
                          '#374151',
              border: '2px solid rgba(255,255,255,0.2)'
            }}
          >
            {isSpeaking ? <Volume2 size={48} color="white" /> : 
             isListening ? <Mic size={48} color="white" /> : 
             isThinking ? (
               <motion.div
                 animate={{ rotate: 360 }}
                 transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                 className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full"
               />
             ) :
             <MicOff size={48} color="white" />}
          </motion.div>
        </div>

        {/* Transcript */}
        <div className="h-24 w-full text-center flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {displayTranscript && (
              <motion.p 
                key="transcript"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-lg text-white/90 font-medium leading-relaxed max-w-sm"
              >
                "{displayTranscript}"
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Interrupt button */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleInterrupt}
              className="mt-4 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium backdrop-blur-sm border border-white/20 transition-colors"
            >
              ✋ Interrupt
            </motion.button>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}
