import { useState } from 'react';
import { Gift, Copy, Check } from 'lucide-react';

interface Template {
  tag: string;
  text: string;
}

const TEMPLATES: Template[] = [
  { tag: '🎂 Birthday', text: 'Happy Birthday machang! Wishing you a super year ahead filled with joy and success!' },
  { tag: '💖 Love', text: 'Aney chooti, thinking of you always. Sending you this sweet surprise to brighten your day!' },
  { tag: '💍 Wedding', text: 'Congratulations on your big day! Wishing you both a lifetime of happiness, love, and togetherness.' },
  { tag: '🙏 Thanks', text: 'Bohoma stuti for everything! Really appreciate all your support and help.' },
  { tag: '🌾 Avurudu', text: 'Subha Aluth Avuruddayak Wewa! May this new year bring you and your family abundance and joy.' }
];

export default function GiftComposer({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const applyTemplate = (text: string) => {
    onChange(text);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-kado-card/50 border border-white/5 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-1.5 text-xs text-white/80 font-bold">
        <Gift size={14} className="text-kado-orange" />
        Add Gift Card Message
      </div>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATES.map((tmpl, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => applyTemplate(tmpl.text)}
            className="px-2 py-1 bg-kado-surface/80 hover:bg-kado-surface border border-white/5 hover:border-kado-orange/30 text-[10px] text-white/70 hover:text-kado-orange rounded-lg transition-all"
          >
            {tmpl.tag}
          </button>
        ))}
      </div>

      {/* Custom Text Area */}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your personal message here... KADO will pass this directly to Kapruka!"
          rows={3}
          className="w-full px-3 py-2 bg-kado-surface border border-white/5 focus:border-kado-orange/30 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none transition-colors"
        />

        {value && (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-2 bottom-3 text-kado-muted hover:text-white transition-colors"
            title="Copy message"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}
