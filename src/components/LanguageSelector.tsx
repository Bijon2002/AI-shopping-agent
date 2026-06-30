import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { translations } from '../lib/translations';
import type { Language } from '../lib/translations';
import { Globe, Sparkles } from 'lucide-react';

export default function LanguageSelector() {
  const { language, setLanguage, showLanguageSelector, setShowLanguageSelector, setShowInfoModal } = useStore();

  useEffect(() => {
    // If language is not selected in local storage, prompt user
    const hasSelected = localStorage.getItem('Kapruka-language-selected');
    if (!hasSelected) {
      setShowLanguageSelector(true);
    }
  }, [setShowLanguageSelector]);

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
  };

  const handleConfirm = () => {
    localStorage.setItem('Kapruka-language-selected', 'true');
    setShowLanguageSelector(false);
    
    // Automatically trigger Features onboarding modal if not dismissed yet
    const dismissed = localStorage.getItem('kado-info-dismissed');
    if (!dismissed) {
      setShowInfoModal(true);
    }
  };

  const t = translations[language] || translations.en;

  if (!showLanguageSelector) return null;

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_30px_70px_rgba(0,0,0,0.8)] flex flex-col p-6 sm:p-8"
          style={{ background: 'linear-gradient(180deg, rgba(24,24,27,0.9) 0%, rgba(9,9,11,0.95) 100%)' }}
        >
          {/* Ambient Glow */}
          <div className="absolute top-[-20%] left-[-20%] w-[200px] h-[200px] rounded-full bg-purple-500/10 blur-[60px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[180px] h-[180px] rounded-full bg-Kapruka-orange/10 blur-[50px] pointer-events-none" />

          {/* Top border glow */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-Kapruka-orange to-Kapruka-gold" />

          {/* Icon */}
          <div className="flex justify-center mb-6 mt-2">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-Kapruka-orange shadow-lg">
              <Globe size={32} className="animate-pulse" />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-center font-display text-lg sm:text-xl font-bold tracking-tight text-white mb-6">
            {t.selectLanguagePrompt}
          </h2>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {[
              { id: 'en', title: 'English', sub: 'English Language', badge: 'EN' },
              { id: 'si', title: 'සිංහල', sub: 'Sinhala Language', badge: 'සිං' },
              { id: 'ta', title: 'தமிழ்', sub: 'Tamil Language', badge: 'தமி' }
            ].map((lang) => {
              const active = language === lang.id;
              return (
                <button
                  key={lang.id}
                  onClick={() => handleSelectLanguage(lang.id as Language)}
                  className={`w-full p-4 rounded-xl border flex items-center justify-between text-left transition-all duration-300 ${
                    active
                      ? 'border-Kapruka-orange bg-Kapruka-orange/15 shadow-[0_0_15px_rgba(255,107,43,0.15)]'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white text-sm sm:text-base">{lang.title}</div>
                    <div className="text-[10px] text-white/50">{lang.sub}</div>
                  </div>
                  <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded ${
                    active ? 'bg-Kapruka-orange text-white' : 'bg-white/10 text-white/60'
                  }`}>
                    {lang.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Confirm Button */}
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(255,107,43,0.2)' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirm}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-Kapruka-orange to-orange-500 text-white font-display font-extrabold text-sm shadow-[0_8px_20px_rgba(255,107,43,0.25)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles size={16} />
            <span>{t.continueBtn}</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
