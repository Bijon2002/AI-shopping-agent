import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart, Heart, Menu, Code, Globe, ImagePlus, Sparkles, User } from 'lucide-react';
import MessageList from './MessageList';
import VoiceMode from './VoiceMode';
import ChatInput from './ChatInput';
import CartDrawer from './CartDrawer';
import WishlistDrawer from './WishlistDrawer';
import HistoryDrawer from './HistoryDrawer';
import LanguageSelector from './LanguageSelector';
import ProfileDrawer from './ProfileDrawer';
import ProductDetailsModal from './ProductDetailsModal';
import { useStore } from '../store';
import { useTheme } from './ThemeProvider';
import { sendMessage } from '../lib/openrouter';
import { getOccasion, getSystemContextNote, getSearchGuidance } from '../lib/occasion-engine';
import { setCurrentOccasion } from '../lib/kapruka-mcp';
import { parseIntent } from '../lib/search-intelligence';
import { toast } from 'react-hot-toast';
import { translations } from '../lib/translations';

export default function ChatShell() {
  const {
    messages, addMessage, updateLastAssistant, clearMessages,
    cart, cartOpen, setCartOpen, wishlist, wishlistOpen, setWishlistOpen,
    historyOpen, setHistoryOpen,
    detectedOccasion, setDetectedOccasion,
    globalShopMode, setGlobalShopMode,
    voiceModeOpen, setVoiceModeOpen,
    clearCart, removeFromCart,
    language, setShowLanguageSelector,
    profileOpen, setProfileOpen,
    savedPeople, preferences,
    showInfoModal, setShowInfoModal
  } = useStore();

  const t = translations[language] || translations.en;

  const { isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [currentToolName, setCurrentToolName] = useState<string | null>(null);
  const [voiceOutput, setVoiceOutput] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('kado-info-dismissed');
    const langSelected = localStorage.getItem('Kapruka-language-selected');
    if (!dismissed && langSelected) {
      setShowInfoModal(true);
    }
  }, [setShowInfoModal]);

  const processImageFile = (file: File) => {
    if (messages.some(m => m.image)) {
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
        if (width > height) { height *= MAX_SIZE / width; width = MAX_SIZE; } 
        else { width *= MAX_SIZE / height; height = MAX_SIZE; }
      }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, width, height);
        setUploadedImage(canvas.toDataURL('image/jpeg', 0.8));
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { alert("Could not process this image format."); URL.revokeObjectURL(url); };
    img.src = url;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsGlobalDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsGlobalDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsGlobalDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    }
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const wishlistCount = wishlist.length;
  const userMessagesCount = messages.filter(m => m.role === 'user').length;
  const isWelcome = userMessagesCount === 0 && !isLoading;

  const handleSendMessage = async (text: string, image?: string, onFinish?: (text: string) => void) => {
    addMessage({ id: crypto.randomUUID(), role: 'user', text, image });
    setIsLoading(true);
    setCurrentToolName(null);

    // Detect occasion from this message using parseIntent, or carry over from earlier
    const intent = await parseIntent(text);
    let occasion = intent.occasion ? getOccasion(intent.occasion) : null;
    if (occasion) {
      setDetectedOccasion(occasion.name);
    } else if (detectedOccasion) {
      // Carry over the previously detected occasion (e.g. user said "amma" earlier)
      occasion = getOccasion(detectedOccasion) ?? null;
    }

    // ═══ FIX #2+3: Set the active occasion on the MCP module for post-search filtering
    setCurrentOccasion(occasion);

    addMessage({ id: crypto.randomUUID(), role: 'assistant', text: '' });

    const historyPayload = messages.map(m => {
      if (m.image) {
        const supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const isSupported = supportedFormats.some(fmt => m.image?.startsWith(`data:${fmt}`));
        
        if (isSupported) {
          return {
            role: m.role,
            content: [
              { type: 'text', text: m.text || 'Please look at this image.' },
              { type: 'image_url', image_url: { url: m.image } }
            ]
          };
        } else {
          return { role: m.role, content: (m.text || '') + '\n[Image removed: unsupported format]' };
        }
      }
      return { role: m.role, content: m.text };
    });

    if (image) {
      historyPayload.push({
        role: 'user',
        content: [
          { type: 'text', text: text || 'Please look at this image.' },
          { type: 'image_url', image_url: { url: image } }
        ]
      });
    } else {
      historyPayload.push({ role: 'user', content: text });
    }

    // Inject user profile details, dietary restrictions, and preferred language dynamically to guide the LLM
    const prefContext = `[USER PROFILE & SETTINGS]
- Preferred Interface Language: ${language === 'si' ? 'Sinhala' : language === 'ta' ? 'Tamil' : 'English'}
- Saved Recipients: ${savedPeople.map(p => `${p.name} (${p.relation}${p.birthday ? `, Birthday: ${p.birthday}` : ''})`).join(', ') || 'None'}
- Dietary Preferences: ${(preferences.dietary || []).join(', ') || 'None'}
- General Budget: LKR ${preferences.budgetMin || 0} to LKR ${preferences.budgetMax || 100000}
- Shopping Notes: ${preferences.notes || 'None'}

Please remember to respond in the user's preferred language/dialect, and use these saved recipient relations (e.g. if the user says "Amma", they refer to the recipient named ${savedPeople.find(p => p.relation.toLowerCase() === 'mother' || p.relation.toLowerCase() === 'amma')?.name || 'Amma'}) and dietary restrictions automatically when suggesting products!`;

    historyPayload.push({ role: 'user', content: prefContext });

    if (occasion) {
      historyPayload.push({ role: 'user', content: getSystemContextNote(occasion) });
      // ═══ FIX #3: Inject search guidance with preferred queries & negative keywords
      historyPayload.push({ role: 'user', content: getSearchGuidance(occasion) });
    }

    if (cart.length > 0) {
      const cartContext = `[SYSTEM STATE - CART SUMMARY]\nThe user currently has ${cartCount} items in their cart:\n` +
        cart.map(i => `- ${i.qty}x ${i.product.name} (ID: ${i.product.id}) (LKR ${i.product.price} each)`).join('\n') +
        `\nBase Total: LKR ${cart.reduce((s, i) => s + (i.product.price * i.qty), 0)}\n(Use these exact prices when calculating the invoice!)`;
      historyPayload.push({ role: 'user', content: cartContext });
    }

    let acc = '';
    let accProducts: any[] = [];
    try {
      await sendMessage(
        historyPayload,
        globalShopMode,
        (chunk) => {
          if (chunk.startsWith('\x00REPLACE\x00')) {
            acc = chunk.slice('\x00REPLACE\x00'.length);
          } else {
            acc += chunk;
          }
          updateLastAssistant(acc, accProducts.length > 0 ? accProducts : undefined);
        },
        (products) => { 
          const newProducts = products.filter((p: any) => !accProducts.some(ap => ap.id === p.id));
          accProducts = [...accProducts, ...newProducts];
          updateLastAssistant(acc, accProducts); 
        },
        (payUrl) => { updateLastAssistant(acc, accProducts.length > 0 ? accProducts : undefined, payUrl); },
        (orderNo) => { updateLastAssistant(acc, accProducts.length > 0 ? accProducts : undefined, undefined, orderNo); },
        (trackingData) => { updateLastAssistant(acc, accProducts.length > 0 ? accProducts : undefined, undefined, undefined, trackingData); },
        (invoiceData) => { updateLastAssistant(acc, accProducts.length > 0 ? accProducts : undefined, undefined, undefined, undefined, invoiceData); },
        (toolName) => { setCurrentToolName(toolName); },
        () => { setCurrentToolName(null); },
        (action, payload) => {
          if (action === 'empty') clearCart();
          else if (action === 'remove') removeFromCart(payload);
        }
      );
    } catch (err: any) {
      acc = `Aney machang, I hit a snag: ${err.message || 'connection failed'}. Please try again!`;
      updateLastAssistant(acc);
    } finally {
      setIsLoading(false);
      setCurrentToolName(null);
      if (onFinish) {
        onFinish(acc);
      } else if (voiceOutput && acc.trim()) {
        const u = new SpeechSynthesisUtterance(acc.trim());
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en-GB')) || voices[0];
        if (voice) u.voice = voice;
        u.rate = 1.1;
        window.speechSynthesis.speak(u);
      }
    }
  };

  // ═══ Strategic Upgrade #4: Global Shop Chrome Extension Integration ═══
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GLOBAL_SHOP_IMPORT') {
        const { productTitle, productUrl, price, image } = event.data.payload || {};
        
        setGlobalShopMode(true);
        
        const prompt = `[GLOBAL SHOP IMPORT]\nI found this item on another website and want to buy it via Kapruka Global Shop:\nTitle: ${productTitle || 'Unknown Product'}\nURL: ${productUrl || ''}\nPrice: ${price || 'Unknown'}\n\nPlease help me calculate the total landed cost to Sri Lanka and guide me through ordering it.`;
        
        // Execute the prompt simulating the user
        setTimeout(() => {
          handleSendMessage(prompt, image);
        }, 100);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [globalShopMode, messages, isLoading, currentToolName, voiceOutput]); // Include dependencies of handleSendMessage

  return (
    <div 
      className="h-full w-full flex flex-col relative overflow-hidden" 
      style={{ background: 'var(--bg-base)' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ═══ Global Drag Overlay ═══ */}
      {isGlobalDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-all pointer-events-none">
          <div className="w-64 h-64 border-4 border-dashed border-Kapruka-orange rounded-3xl flex flex-col items-center justify-center text-Kapruka-orange animate-pulse bg-Kapruka-orange/10 shadow-2xl">
            <ImagePlus size={64} className="mb-4" />
            <h2 className="font-display text-xl font-bold">Drop Image Here</h2>
          </div>
        </div>
      )}

      {/* ═══ Persistent Video Background ═══ */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay muted loop playsInline
          className="w-full h-full object-cover"
          src="/bg.mp4"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0" style={{
          background: isDark
            ? 'rgba(9,9,11,0.85)' // Slightly darker overlay to improve message readability over dynamic video background
            : 'rgba(250,250,250,0.88)',
        }} />
      </div>

      {/* ═══ Aurora orbs (chat mode only) ═══ */}
      {!isWelcome && (
        <div className="aurora-bg">
          <div className="aurora-orb"
            style={{
              width: '500px', height: '500px', top: '-15%', left: '15%',
              background: isDark ? 'radial-gradient(circle, rgba(139,0,0,0.1) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(139,0,0,0.06) 0%, transparent 70%)',
              animationDuration: '8s',
            }} />
          <div className="aurora-orb"
            style={{
              width: '400px', height: '400px', bottom: '-10%', right: '10%',
              background: isDark ? 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(168,85,247,0.04) 0%, transparent 70%)',
              animationDuration: '10s', animationDelay: '-3s',
            }} />
        </div>
      )}

      {/* ═══ Header ═══ */}
      <header className="flex-none px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between z-20 glass relative gradient-border-bottom">
        <button
          onClick={() => { clearMessages(); setDetectedOccasion(null); }}
          className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity text-left cursor-pointer focus:outline-none"
        >
          <img src="/kado-logo.png" alt="Kapruka" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl object-cover shadow-xl animate-glow" />
          <div>
            <h1 className="font-display font-extrabold text-sm sm:text-base tracking-wide gradient-text leading-none">{t.appTitle}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {detectedOccasion ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="text-[8px] sm:text-[9px] uppercase font-bold tracking-widest px-1.5 sm:px-2 py-0.5 rounded-full bg-Kapruka-orange/15 text-Kapruka-orange border border-Kapruka-orange/20">
                  {detectedOccasion} Mode
                </motion.span>
              ) : (
                <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-widest hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
                  {t.subtitle}
                </span>
              )}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Language Switcher */}
          <button
            onClick={() => setShowLanguageSelector(true)}
            className="px-2 py-1.5 sm:px-2.5 rounded-lg sm:rounded-xl transition-all duration-300 theme-t flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-muted)'
            }}
            title={t.language}
          >
            <Globe size={13} className="text-Kapruka-orange" />
            <span>{language}</span>
          </button>

          {/* Profile / Saved Info Button */}
          <button
            onClick={() => setProfileOpen(true)}
            className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-300 theme-t relative"
            style={{
              background: profileOpen ? 'rgba(255,107,43,0.1)' : 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: profileOpen ? 'var(--Kapruka-orange)' : 'var(--text-muted)'
            }}
            title={t.profile}
          >
            <User size={16} />
          </button>


          {/* TTS Toggle */}
          <button onClick={() => setVoiceOutput(!voiceOutput)}
            className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-300 theme-t"
            style={{
              background: voiceOutput ? 'rgba(255,107,43,0.1)' : 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: voiceOutput ? 'var(--Kapruka-orange)' : 'var(--text-muted)'
            }}>
            {voiceOutput ? <span title="Voice Output On">🔊</span> : <span title="Voice Output Off">🔈</span>}
          </button>

          {/* Global Shop Toggle */}
          <button onClick={() => setGlobalShopMode(!globalShopMode)}
            className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-300 theme-t"
            style={{
              background: globalShopMode ? 'rgba(59,130,246,0.1)' : 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: globalShopMode ? '#3b82f6' : 'var(--text-muted)'
            }}
            title={globalShopMode ? "Global Shop Extension Active" : "Enable Global Shop Extension"}>
            <Globe size={16} />
          </button>

          {/* History / Menu */}
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }}
            onClick={() => setHistoryOpen(true)}
            className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl theme-t"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
            <Menu size={16} />
          </motion.button>

          {/* Wishlist */}
          {wishlistCount > 0 && (
            <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }}
              onClick={() => setWishlistOpen(true)}
              className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl relative theme-t"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <Heart size={16} className="text-Kapruka-pink" fill="#FF6B7D" />
              <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[8px] font-bold bg-Kapruka-pink text-white rounded-full">{wishlistCount}</span>
            </motion.button>
          )}

          {/* Cart */}
          <button onClick={() => setCartOpen(true)}
            className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl relative flex items-center gap-1 sm:gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95 theme-t"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <ShoppingCart size={16} style={{ color: 'var(--text-primary)' }} />
            {cartCount > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold bg-Kapruka-orange text-white rounded-full min-w-[16px]">
                {cartCount}
              </motion.span>
            )}
          </button>
        </div>
      </header>

      {/* ═══ Main Container ═══ */}
      <div className="flex-1 flex w-full overflow-hidden relative z-10">
        {/* Chat Area */}
        <main className="flex-1 overflow-hidden flex flex-col relative">
          <MessageList isLoading={isLoading} currentToolName={currentToolName} onSend={handleSendMessage} />
          <ChatInput onSend={handleSendMessage} disabled={isLoading} image={uploadedImage} setImage={setUploadedImage} />

          <div className="text-center text-[10px] sm:text-xs pb-2 sm:pb-3 flex items-center justify-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <Code size={12} className="text-Kapruka-orange opacity-80" />
            <span>Developed by <a href="https://bijonn.pages.dev/" target="_blank" rel="noopener noreferrer" className="text-Kapruka-orange hover:underline font-bold tracking-wide">BIJON</a></span>
          </div>
        </main>

        {/* Desktop Voice Mode Sidebar */}
        <AnimatePresence>
          {voiceModeOpen && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="hidden lg:block w-[360px] h-full flex-none border-l relative overflow-hidden z-20"
              style={{ borderColor: 'var(--border-default)', background: 'var(--bg-base)' }}
            >
              <VoiceMode inline={true} onClose={() => setVoiceModeOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {cartOpen && <CartDrawer />}
        {wishlistOpen && <WishlistDrawer />}
        {historyOpen && <HistoryDrawer />}
        {profileOpen && <ProfileDrawer />}
        <LanguageSelector />
        <ProductDetailsModal />
        {voiceModeOpen && (
          <div className="lg:hidden">
            <VoiceMode onClose={() => setVoiceModeOpen(false)} />
          </div>
        )}


        {/* ═══ Info Modal ═══ */}
        {showInfoModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-white/10 shadow-[0_30px_70px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]"
              style={{ background: 'linear-gradient(180deg, rgba(24,24,27,0.9) 0%, rgba(9,9,11,0.95) 100%)' }}
            >
              {/* Background ambient glow inside the card */}
              <div className="absolute top-[-20%] left-[-20%] w-[300px] h-[300px] rounded-full bg-purple-500/10 blur-[80px] pointer-events-none" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[250px] h-[250px] rounded-full bg-Kapruka-orange/10 blur-[60px] pointer-events-none" />

              {/* Decorative top gradient bar */}
              <div className="h-[3px] w-full bg-gradient-to-r from-purple-500 via-Kapruka-orange to-Kapruka-gold" />

              <div className="p-6 sm:p-10 flex flex-col h-full overflow-y-auto custom-scrollbar relative z-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3.5 rounded-[1.25rem] bg-gradient-to-br from-Kapruka-orange to-orange-500 text-white shadow-lg">
                      <Sparkles size={26} className="animate-pulse" />
                    </div>
                    <div>
                      <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                        Kapruka AI Buddy
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md bg-purple-500/25 text-purple-300 border border-purple-500/20">
                          v1.2 Live
                        </span>
                        <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md bg-Kapruka-orange/20 text-orange-300 border border-Kapruka-orange/20">
                          100% Conversational
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Verified Developer Badge */}
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/5 bg-white/5 w-fit shadow-inner">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-bold tracking-wider text-white/70 uppercase">
                      Developer: <span className="text-Kapruka-orange font-black">BIJON</span>
                    </span>
                  </div>
                </div>

                <p className="text-sm leading-relaxed mb-6 text-white/70">
                  {language === 'si'
                    ? 'අනේ මචං! ඔයාගේ සජීවී ශ්‍රී ලාංකික සාප්පු සවාරි සහකරු වෙත සාදරයෙන් පිළිගනිමු. මට සිංහල/Singlish, දෙමළ/Tanglish, හෝ ඉංග්‍රීසි කතා කරන්න පුළුවන්. මෙන්න මම ඔබ වෙනුවෙන්ම සූදානම් කර ඇති සුවිශේෂී පහසුකම්:'
                    : language === 'ta'
                    ? 'அனே மச்சான்! உங்களது நிகழ்நேர இலங்கை ஷாப்பிங் துணணக்கு வரவேற்கிறோம். நான் சிங்களம்/சிங்கிலிஷ், தமிழ்/தமிழிலிஷ் அல்லது ஆங்கிலம் பேசக்கூடியவன். உங்களுக்காக நான் உருவாக்கிய சில அம்சங்கள் இதோ:'
                    : 'Aney machang! Welcome to your real-time Sri Lankan shopping companion. I can speak Sinhala/Singlish, Tamil/Tanglish, or English. Here are all the powerful features I have built in for you:'}
                </p>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {/* Feature 1 */}
                  <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all hover:border-purple-500/25 group text-left">
                    <div className="text-purple-400 mb-2 font-bold flex items-center gap-2">
                      <span className="text-lg">🎙️</span>
                      <span className="text-sm font-black group-hover:text-purple-300 transition-colors">Gemini Live Voice Mode</span>
                    </div>
                    <p className="text-[11px] leading-normal text-white/50">
                      Native bidirectional real-time conversation. Talk freely, and I will respond instantly via audio with responsive visualizers.
                    </p>
                  </div>

                  {/* Feature 2 */}
                  <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all hover:border-orange-500/25 group text-left">
                    <div className="text-orange-400 mb-2 font-bold flex items-center gap-2">
                      <span className="text-lg">🍰</span>
                      <span className="text-sm font-black group-hover:text-orange-300 transition-colors">Smart Product Search</span>
                    </div>
                    <p className="text-[11px] leading-normal text-white/50">
                      Query Kapruka cakes, rose bouquets, Java chocolates, teddy bears, grocery packs, and cards using intelligent occasion filtering.
                    </p>
                  </div>

                  {/* Feature 3 */}
                  <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all hover:border-purple-500/25 group text-left">
                    <div className="text-purple-400 mb-2 font-bold flex items-center gap-2">
                      <span className="text-lg">🇱🇰</span>
                      <span className="text-sm font-black group-hover:text-purple-300 transition-colors">Multilingual Mirroring</span>
                    </div>
                    <p className="text-[11px] leading-normal text-white/50">
                      Built to respond in the exact language/dialect you write. Full support for Singlish and Tanglish with local slang.
                    </p>
                  </div>

                  {/* Feature 4 */}
                  <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all hover:border-orange-500/25 group text-left">
                    <div className="text-orange-400 mb-2 font-bold flex items-center gap-2">
                      <span className="text-lg">📦</span>
                      <span className="text-sm font-black group-hover:text-orange-300 transition-colors">Frictionless Checkout</span>
                    </div>
                    <p className="text-[11px] leading-normal text-white/50">
                      Complete guest checkout in under 2 minutes: select city, verify date, add recipient details, and generate invoice paylinks.
                    </p>
                  </div>

                  {/* Feature 5 */}
                  <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all hover:border-purple-500/25 group text-left">
                    <div className="text-purple-400 mb-2 font-bold flex items-center gap-2">
                      <span className="text-lg">✈️</span>
                      <span className="text-sm font-black group-hover:text-purple-300 transition-colors">Amazon & eBay Extension</span>
                    </div>
                    <p className="text-[11px] leading-normal text-white/50">
                      Paste global shopping links directly into chat to automatically estimate total landed shipping cost to Sri Lanka.
                    </p>
                  </div>

                  {/* Feature 6 */}
                  <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all hover:border-orange-500/25 group text-left">
                    <div className="text-orange-400 mb-2 font-bold flex items-center gap-2">
                      <span className="text-lg">🖼️</span>
                      <span className="text-sm font-black group-hover:text-orange-300 transition-colors">Vision Search (1 Limit)</span>
                    </div>
                    <p className="text-[11px] leading-normal text-white/50">
                      Upload an image, and I will scan for visually matching items. Restricted to exactly 1 image upload per chat session.
                    </p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-auto border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="text-[10px] text-white/40 leading-relaxed max-w-xs text-center sm:text-left">
                    By clicking continue, you agree to allow browser microphone access for Live Voice Mode.
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.04, boxShadow: '0 0 30px rgba(255,107,43,0.3)' }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      localStorage.setItem('kado-info-dismissed', 'true');
                      setShowInfoModal(false);
                    }}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-Kapruka-orange via-orange-500 to-amber-500 text-white font-black text-sm shadow-[0_8px_30px_rgba(255,107,43,0.35)] cursor-pointer tracking-wider"
                  >
                    {language === 'si' ? 'හරි, සාප්පු සවාරි යමු!' : language === 'ta' ? 'சரி, வாங்கலாம்!' : "OK, Let's Shop!"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
