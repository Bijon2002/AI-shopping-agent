import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Copy, Check, Wand2 } from 'lucide-react';

interface Template {
  tag: string;
  text: string;
  color: string;
}

const TEMPLATES: Template[] = [
  { tag: '🎂 Birthday', text: 'Happy Birthday machang! Wishing you a super year ahead filled with joy and success!', color: '#FF6B7D' },
  { tag: '💖 Love', text: 'Aney chooti, thinking of you always. Sending you this sweet surprise to brighten your day!', color: '#A855F7' },
  { tag: '💍 Wedding', text: 'Congratulations on your big day! Wishing you both a lifetime of happiness and togetherness.', color: '#F5C518' },
  { tag: '🙏 Thanks', text: 'Bohoma stuti for everything! Really appreciate all your support and help.', color: '#10B981' },
  { tag: '🌾 Avurudu', text: 'Subha Aluth Avuruddayak Wewa! May this new year bring your family abundance and joy.', color: '#3B82F6' },
];

export default function GiftComposer({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl p-4 space-y-3 theme-t" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
        <Wand2 size={14} className="text-kado-orange" />
        Gift Card Message
      </div>

      {/* Template Chips */}
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATES.map((t, i) => (
          <motion.button
            key={i}
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onChange(t.text)}
            className="px-2.5 py-1.5 text-[10px] font-semibold rounded-lg transition-all duration-200"
            style={{
              background: `${t.color}15`,
              border: `1px solid ${t.color}30`,
              color: 'var(--text-primary)',
            }}
          >
            {t.tag}
          </motion.button>
        ))}
      </div>

      {/* Textarea */}
      <div className="relative input-glow rounded-xl">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write a personal message…"
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all resize-none placeholder:text-[var(--text-muted)]"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
        />
        {value && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.8 }}
            onClick={handleCopy}
            className="absolute right-2.5 bottom-2.5 p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Copy"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </motion.button>
        )}
      </div>

      {value && (
        <p className="text-[10px] text-right" style={{ color: 'var(--text-muted)' }}>
          {value.length} characters
        </p>
      )}
    </div>
  );
}
