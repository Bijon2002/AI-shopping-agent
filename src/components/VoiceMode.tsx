import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Volume2, Sparkles, RefreshCw } from 'lucide-react';
import { useStore } from '../store';
import { KAPRUKA_TOOLS, SYSTEM_PROMPT } from '../lib/tools';
import * as MCP from '../lib/kapruka-mcp';

// Model configuration for Gemini Live API
const GEMINI_LIVE_MODEL = 'models/gemini-2.0-flash-exp';

export default function VoiceMode({ 
  onClose,
  inline = false
}: { 
  onClose: () => void;
  inline?: boolean;
}) {
  const {
    addMessage,
    updateLastAssistant,
    clearCart,
    removeFromCart,
  } = useStore();

  const [status, setStatus] = useState('Connecting...');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [displayTranscript, setDisplayTranscript] = useState('');
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null);
  const [micVolume, setMicVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);

  // References for latest values (Latest Ref Pattern) to avoid re-triggering connection
  const addMessageRef = useRef(addMessage);
  const updateLastAssistantRef = useRef(updateLastAssistant);
  const clearCartRef = useRef(clearCart);
  const removeFromCartRef = useRef(removeFromCart);

  useEffect(() => {
    addMessageRef.current = addMessage;
    updateLastAssistantRef.current = updateLastAssistant;
    clearCartRef.current = clearCart;
    removeFromCartRef.current = removeFromCart;
  });

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);

  // Playback queue management
  const nextPlayTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  
  // Keep track of active assistant response texts & items to update store
  const currentAssistantMsgIdRef = useRef<string | null>(null);
  const accumulatedTextRef = useRef<string>('');
  const accumulatedProductsRef = useRef<any[]>([]);

  // Convert ArrayBuffer to Base64 (needed for Gemini Live API WebSocket chunks)
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Convert Base64 to ArrayBuffer
  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // Clear AI audio playback queue
  const stopPlayback = useCallback(() => {
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    audioSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
    setIsSpeaking(false);
    setAiVolume(0);
  }, []);

  // Queue and play AI output raw 24kHz Int16 PCM audio chunks
  const playPcmChunk = useCallback((base64Data: string) => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    try {
      const buffer = base64ToArrayBuffer(base64Data);
      const int16Array = new Int16Array(buffer);
      const float32Array = new Float32Array(int16Array.length);
      
      // Normalize Int16 to Float32 [-1.0, 1.0]
      let sumSquares = 0;
      for (let i = 0; i < int16Array.length; i++) {
        const val = int16Array[i] / 32768.0;
        float32Array[i] = val;
        sumSquares += val * val;
      }
      
      // Calculate RMS for visualizer
      const rms = Math.sqrt(sumSquares / int16Array.length);
      setAiVolume(Math.min(100, Math.floor(rms * 250)));

      // Create an AudioBuffer (24kHz, Mono)
      const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      
      // Schedule playback to chain chunks seamlessly
      const startTime = Math.max(nextPlayTimeRef.current, audioCtx.currentTime);
      source.start(startTime);
      
      nextPlayTimeRef.current = startTime + audioBuffer.duration;
      audioSourcesRef.current.push(source);
      setIsSpeaking(true);

      source.onended = () => {
        // Clean up finished source
        audioSourcesRef.current = audioSourcesRef.current.filter(src => src !== source);
        if (audioSourcesRef.current.length === 0) {
          setIsSpeaking(false);
          setAiVolume(0);
        }
      };
    } catch (e) {
      console.error('[VoiceMode] Failed to play audio chunk:', e);
    }
  }, []);

  // Format local KAPRUKA_TOOLS schemas to Gemini's native function declarations
  const getGeminiTools = () => {
    return [
      {
        functionDeclarations: KAPRUKA_TOOLS.map(t => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters
        }))
      }
    ];
  };

  // Run the requested MCP tool and return the output
  const handleToolCall = async (callId: string, name: string, args: any) => {
    setIsThinking(true);
    setStatus(`Checking ${name.replace('kapruka_', '').replace('_', ' ')}...`);

    let result: any;
    try {
      if (name === 'kapruka_search_products') {
        const data = await MCP.smartSearch(args.q, args);
        result = data;
        if (data?.products?.length) {
          accumulatedProductsRef.current = data.products;
          if (currentAssistantMsgIdRef.current) {
            updateLastAssistantRef.current(accumulatedTextRef.current, data.products);
          }
        }
      } else if (name === 'kapruka_check_delivery') {
        result = await MCP.checkDelivery(args.city, args.delivery_date, args.product_id);
      } else if (name === 'kapruka_list_delivery_cities') {
        result = await MCP.listDeliveryCities(args.query);
      } else if (name === 'kapruka_create_order') {
        const data: any = await MCP.createOrder(args);
        result = data;
        if (currentAssistantMsgIdRef.current) {
          updateLastAssistantRef.current(
            accumulatedTextRef.current,
            accumulatedProductsRef.current.length ? accumulatedProductsRef.current : undefined,
            data?.pay_url || undefined,
            data?.order_number || undefined
          );
        }
      } else if (name === 'kapruka_track_order') {
        result = await MCP.trackOrder(args.order_number);
        if (currentAssistantMsgIdRef.current) {
          updateLastAssistantRef.current(
            accumulatedTextRef.current,
            undefined,
            undefined,
            undefined,
            result
          );
        }
      } else if (name === 'kapruka_preview_checkout') {
        result = { success: true, message: 'Invoice displayed.' };
        if (currentAssistantMsgIdRef.current) {
          updateLastAssistantRef.current(
            accumulatedTextRef.current,
            undefined,
            undefined,
            undefined,
            undefined,
            args
          );
        }
      } else if (name === 'kapruka_global_extension') {
        const price = Math.floor(Math.random() * 50000) + 15000;
        result = { success: true, estimated_price_lkr: price, message: `Estimated landed cost: LKR ${price}` };
      } else if (name === 'kapruka_empty_cart') {
        clearCartRef.current();
        result = { success: true, message: 'Cart emptied.' };
      } else if (name === 'kapruka_remove_from_cart') {
        removeFromCartRef.current(args.product_id);
        result = { success: true, message: `Removed ${args.product_id}.` };
      } else {
        result = { error: `Unknown tool: ${name}` };
      }
    } catch (err: any) {
      console.error(`[VoiceMode] Tool ${name} failed:`, err);
      result = { error: err.message || 'Tool failed' };
    }

    // Send tool response back to Gemini
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        toolResponse: {
          functionResponses: [
            {
              id: callId,
              name: name,
              response: {
                output: result
              }
            }
          ]
        }
      }));
    }
    setIsThinking(false);
    setStatus('Connected');
  };

  // Close connection & clean up resources
  const cleanUp = useCallback(() => {
    stopPlayback();

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }

    if (micAnalyserRef.current) {
      micAnalyserRef.current.disconnect();
      micAnalyserRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  }, [stopPlayback]);

  const isMountedRef = useRef(true);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const connectGemini = useCallback(async () => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    // Clean up any existing connection/audio state first
    cleanUp();

    const key = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!key) {
      setStatus('Disconnected');
      setDisconnectReason('Gemini API Key not configured. Set VITE_GEMINI_API_KEY in environment.');
      isConnectingRef.current = false;
      return;
    }
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${key}`;
    
    if (!isMountedRef.current) {
      isConnectingRef.current = false;
      return;
    }
    
    setStatus('Connecting...');
    setNetworkError(false);
    setDisconnectReason(null);
    setDisplayTranscript('');

    try {
      // 1. Initialize AudioContext
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      // 2. Request Mic access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      if (!isMountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        isConnectingRef.current = false;
        return;
      }
      micStreamRef.current = stream;

      // 3. Connect Analyser Node for Visualizer
      const micAnalyser = audioCtx.createAnalyser();
      micAnalyser.fftSize = 64;
      micAnalyserRef.current = micAnalyser;
      audioCtx.createMediaStreamSource(stream).connect(micAnalyser);

      // Analyze microphone volume loop
      const volBuffer = new Uint8Array(micAnalyser.frequencyBinCount);
      const updateMicVolume = () => {
        if (!isMountedRef.current || !micAnalyserRef.current) return;
        micAnalyserRef.current.getByteFrequencyData(volBuffer);
        const sum = volBuffer.reduce((a, b) => a + b, 0);
        const avg = sum / volBuffer.length;
        setMicVolume(Math.min(100, Math.floor(avg * 1.5)));
        requestAnimationFrame(updateMicVolume);
      };
      requestAnimationFrame(updateMicVolume);

      // 4. Set up local Speech Recognition for real-time text feedback of user speech
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.onresult = (e: any) => {
          if (!isMountedRef.current) return;
          // IMPORTANT: Only process transcript and add user message if the connection is active
          if (socketRef.current?.readyState !== WebSocket.OPEN) {
            return;
          }

          let interim = '';
          let final = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) {
              final += e.results[i][0].transcript;
            } else {
              interim += e.results[i][0].transcript;
            }
          }
          const fullText = (final + interim).trim();
          if (fullText) {
            setDisplayTranscript(fullText);
          }

          if (final.trim()) {
            // Write what user spoke directly to the chat timeline so they can see the dialog
            addMessageRef.current({
              id: crypto.randomUUID(),
              role: 'user',
              text: final.trim()
            });
          }
        };
        rec.onend = () => {
          if (isMountedRef.current && socketRef.current?.readyState === WebSocket.OPEN) {
            try { rec.start(); } catch (e) {}
          }
        };
        recognitionRef.current = rec;
        try { rec.start(); } catch (e) {}
      }

      // 5. Open WebSocket
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) {
          ws.close();
          isConnectingRef.current = false;
          return;
        }
        setStatus('Connected');
        setIsListening(true);

        // Send Setup Payload as the first message
        ws.send(JSON.stringify({
          setup: {
            model: GEMINI_LIVE_MODEL,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Puck'
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: SYSTEM_PROMPT }]
            },
            tools: getGeminiTools()
          }
        }));


        currentAssistantMsgIdRef.current = null;
        accumulatedTextRef.current = '';
        accumulatedProductsRef.current = [];

        // Start streaming mic audio chunks to Gemini
        const processor = audioCtx.createScriptProcessor(2048, 1, 1);
        processorNodeRef.current = processor;
        
        audioCtx.createMediaStreamSource(stream).connect(processor);
        processor.connect(audioCtx.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          const base64 = arrayBufferToBase64(pcm16.buffer);
          ws.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: 'audio/pcm',
                  data: base64
                }
              ]
            }
          }));
        };
      };

      ws.onmessage = async (event) => {
        if (!isMountedRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.serverContent) {
            const { modelTurn, interrupted } = msg.serverContent;
            
            if (interrupted) {
              stopPlayback();
              setDisplayTranscript('Listening...');
              return;
            }

            if (modelTurn?.parts) {
              if (!currentAssistantMsgIdRef.current) {
                const newId = crypto.randomUUID();
                addMessageRef.current({ id: newId, role: 'assistant', text: '' });
                currentAssistantMsgIdRef.current = newId;
                accumulatedTextRef.current = '';
                accumulatedProductsRef.current = [];
              }

              for (const part of modelTurn.parts) {
                if (part.text) {
                  accumulatedTextRef.current += part.text;
                  setDisplayTranscript(accumulatedTextRef.current);
                  updateLastAssistantRef.current(
                    accumulatedTextRef.current,
                    accumulatedProductsRef.current.length ? accumulatedProductsRef.current : undefined
                  );
                }
                
                if (part.inlineData && part.inlineData.data) {
                  playPcmChunk(part.inlineData.data);
                }
              }
            }

            if (msg.serverContent.turnComplete) {
              currentAssistantMsgIdRef.current = null;
            }
          }

          if (msg.toolCall?.functionCalls) {
            for (const call of msg.toolCall.functionCalls) {
              await handleToolCall(call.id, call.name, call.args);
            }
          }
        } catch (e) {
          console.error('[VoiceMode] Error parsing WebSocket message:', e);
        }
      };

      ws.onclose = (event) => {
        if (isMountedRef.current) {
          let reason = 'Connection closed';
          if (event.code === 1006) {
            reason = 'Network connection lost or server unreachable';
          } else if (event.code === 1008 || event.code === 1002) {
            reason = 'Authentication or protocol error (check API Key)';
          } else if (event.reason) {
            reason = event.reason;
          }
          console.log(`[VoiceMode] WS Closed. Code: ${event.code}, Reason: ${reason}`);
          setStatus('Disconnected');
          setDisconnectReason(reason);
          setIsListening(false);
          // Clean up speech recognition & audio stream immediately when disconnected
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) {}
          }
          if (processorNodeRef.current) {
            processorNodeRef.current.disconnect();
            processorNodeRef.current = null;
          }
        }
      };

      ws.onerror = (e) => {
        console.error('[VoiceMode] WebSocket Error:', e);
        if (isMountedRef.current) {
          setNetworkError(true);
          setStatus('Error');
        }
      };

    } catch (err: any) {
      console.error('[VoiceMode] Initialization failed:', err);
      if (isMountedRef.current) {
        setNetworkError(true);
        setStatus('Mic Error');
        setDisconnectReason(err.message || 'Microphone access denied');
      }
    } finally {
      isConnectingRef.current = false;
    }
  }, [cleanUp, playPcmChunk]);

  // Connect on mount
  useEffect(() => {
    connectGemini();
    return () => {
      cleanUp();
    };
  }, [connectGemini, cleanUp]);

  const handleInterrupt = () => {
    stopPlayback();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        clientContent: {
          turns: [],
          turnComplete: true
        }
      }));
    }
  };

  const currentStatusText = isThinking ? 'Thinking...'
    : isSpeaking ? 'Speaking...'
    : isListening ? 'Listening...'
    : status;

  const handleOrbClick = () => {
    if (status === 'Disconnected' || status === 'Error' || status === 'Mic Error' || networkError) {
      connectGemini();
    } else {
      handleInterrupt();
    }
  };

  return (
    <motion.div 
      initial={inline ? { opacity: 0, x: 20 } : { opacity: 0, y: 30, scale: 0.95 }}
      animate={inline ? { opacity: 1, x: 0 } : { opacity: 1, y: 0, scale: 1 }}
      exit={inline ? { opacity: 0, x: 20 } : { opacity: 0, y: 30, scale: 0.95 }}
      className={inline 
        ? "relative w-full h-full flex flex-col items-center justify-between p-6 z-30 animate-fade-in" 
        : "fixed bottom-[96px] right-4 sm:right-6 z-40 w-[calc(100%-2rem)] sm:w-[360px] rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl p-5 flex flex-col items-center justify-between"
      }
      style={{ 
        background: inline 
          ? 'linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(9,9,11,1) 100%)'
          : 'linear-gradient(135deg, rgba(24,24,27,0.85) 0%, rgba(9,9,11,0.95) 100%)',
        height: inline ? '100%' : '380px'
      }}
    >
      {/* Decorative gradient orb reflection inside card */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-purple-500/5 via-transparent to-orange-500/5 pointer-events-none" />

      {/* Header Info */}
      <div className="w-full flex items-center justify-between z-10 text-white/50 text-[11px] font-semibold tracking-wider uppercase">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-purple-400 animate-spin duration-3000" />
          <span>Gemini Live Voice Buddy</span>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Dynamic Glowing Sound Orb */}
      <div className="relative w-28 h-28 my-4 cursor-pointer z-10" onClick={handleOrbClick}>
        {/* User microphone input glow */}
        <motion.div 
          animate={{ 
            scale: isListening ? 1 + micVolume / 140 : 1, 
            opacity: isListening ? 0.15 + micVolume / 200 : 0.1 
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="absolute inset-[-20px] rounded-full blur-2xl pointer-events-none"
          style={{ background: isListening ? 'radial-gradient(circle, rgba(239,125,49,0.5) 0%, transparent 70%)' : 'none' }}
        />

        {/* AI speaking output glow */}
        <motion.div 
          animate={{ 
            scale: isSpeaking ? 1 + aiVolume / 110 : 1, 
            opacity: isSpeaking ? 0.2 + aiVolume / 160 : 0.1 
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="absolute inset-[-25px] rounded-full blur-2xl pointer-events-none"
          style={{ background: isSpeaking ? 'radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)' : 'none' }}
        />

        {/* Center Orb */}
        <motion.div 
          animate={
            isSpeaking ? { scale: [1, 1.04, 0.98, 1.02, 1] } :
            isListening ? { scale: [1, 1.02, 0.99, 1] } :
            { scale: 1 }
          }
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-full h-full rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.2)] border border-white/15"
          style={{ 
            background: isSpeaking ? 'linear-gradient(135deg, #A855F7, #EC4899)' : 
                        isListening ? 'linear-gradient(135deg, #EF7D31, #F5C518)' : 
                        isThinking ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' :
                        '#374151',
          }}
        >
          {isSpeaking ? (
            <Volume2 size={32} className="text-white animate-pulse" />
          ) : isListening ? (
            <Mic size={32} className="text-white" />
          ) : isThinking ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full"
            />
          ) : (status === 'Disconnected' || status === 'Error' || status === 'Mic Error' || networkError) ? (
            <RefreshCw size={32} className="text-white/80 animate-spin-slow" />
          ) : (
            <MicOff size={32} className="text-white/60" />
          )}
        </motion.div>
      </div>

      {/* Real-time speech transcript displays here */}
      <div className="h-16 w-full text-center flex flex-col items-center justify-center px-2 overflow-y-auto z-10">
        <AnimatePresence mode="wait">
          {status === 'Disconnected' || status === 'Error' || status === 'Mic Error' || networkError ? (
            <motion.div
              key="disconnected-info"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-red-400 font-bold leading-normal flex flex-col items-center"
            >
              <div>Disconnected</div>
              <div className="text-[10px] text-white/40 font-normal mt-0.5 max-w-[280px]">
                {disconnectReason || 'Reconnect to continue speaking.'}
              </div>
            </motion.div>
          ) : displayTranscript ? (
            <motion.p 
              key="transcript"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-white/90 font-medium leading-relaxed max-w-[280px] drop-shadow-sm"
            >
              {displayTranscript}
            </motion.p>
          ) : (
            <motion.p
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              className="text-[10px] text-white/40 italic"
            >
              Buddy is listening... Talk to me, machang! 🎙️
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <div className="w-full flex items-center justify-between border-t border-white/5 pt-3 z-10">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${
          (status === 'Disconnected' || status === 'Error' || status === 'Mic Error' || networkError) ? 'text-red-400 animate-pulse' : 'text-Kapruka-orange'
        }`}>
          {(status === 'Disconnected' || status === 'Error' || status === 'Mic Error' || networkError) ? 'Disconnected' : currentStatusText}
        </span>

        {isSpeaking ? (
          <button
            onClick={handleInterrupt}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-[9px] uppercase tracking-wider active:scale-95 transition-all"
          >
            ✋ Interrupt
          </button>
        ) : (status === 'Disconnected' || status === 'Error' || status === 'Mic Error' || networkError) ? (
          <button
            onClick={connectGemini}
            className="px-3.5 py-1.5 rounded-xl bg-Kapruka-orange hover:bg-orange-600 text-white font-bold text-[9px] uppercase tracking-wider active:scale-95 transition-all shadow-md"
          >
            🔄 Reconnect
          </button>
        ) : null}
      </div>

    </motion.div>
  );
}
