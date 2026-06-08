import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, CreditCard, CheckCircle } from 'lucide-react';
import ProductCarousel from './ProductCarousel';
import type { Message } from '../types';

/** Simple markdown renderer */
function renderMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let listBuffer: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listBuffer.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag key={`list-${elements.length}`} className={listType === 'ul' ? 'list-disc pl-4 my-1' : 'list-decimal pl-4 my-1'}>
          {listBuffer.map((item, i) => <li key={i} className="mb-0.5">{inlineMarkdown(item)}</li>)}
        </Tag>
      );
      listBuffer = []; listType = null;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (/^[-•*]\s+/.test(trimmed)) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listBuffer.push(trimmed.replace(/^[-•*]\s+/, '')); return;
    }
    if (/^\d+[.)]\s+/.test(trimmed)) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listBuffer.push(trimmed.replace(/^\d+[.)]\s+/, '')); return;
    }
    flushList();
    if (trimmed === '') elements.push(<br key={`br-${idx}`} />);
    else elements.push(<p key={`p-${idx}`} className="mb-0.5">{inlineMarkdown(trimmed)}</p>);
  });
  flushList();
  return <div className="md-content">{elements}</div>;
}

function inlineMarkdown(text: string): (string | ReactNode)[] {
  const parts: (string | ReactNode)[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))/g;
  let lastIndex = 0; let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1]) parts.push(<strong key={match.index}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={match.index}>{match[4]}</em>);
    else if (match[5]) parts.push(<code key={match.index} className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-elevated)' }}>{match[6]}</code>);
    else if (match[7]) parts.push(<a key={match.index} href={match[9]} target="_blank" rel="noopener noreferrer" className="text-kado-orange underline underline-offset-2">{match[8]}</a>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : [text];
}

export default function MessageBubble({ msg, onSend }: { msg: Message, onSend?: (t: string) => void }) {
  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-2 sm:gap-3 mb-4 sm:mb-5 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-none shadow-lg relative overflow-hidden"
          style={{ border: '1px solid rgba(255,107,43,0.3)' }}>
          <img src="/kado-logo.png" alt="K" className="w-full h-full object-cover" />
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-kado-emerald rounded-full border-2" style={{ borderColor: 'var(--bg-base)' }} />
        </div>
      )}

      <div className={`max-w-[85%] sm:max-w-[78%] space-y-2 sm:space-y-3 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bubble */}
        <div className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-lg theme-t ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
          style={isUser
            ? { background: 'linear-gradient(135deg, #FF6B2B, #FF8F5C)', color: '#fff', boxShadow: '0 8px 25px rgba(255,107,43,0.25)' }
            : { background: 'var(--bubble-assistant-bg)', border: '1px solid var(--bubble-assistant-border)', color: 'var(--text-primary)', backdropFilter: 'blur(12px)' }
          }>
          {isUser ? (
            <p className="text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
          ) : (
            <div className="text-[13px] sm:text-sm leading-relaxed">{renderMarkdown(msg.text)}</div>
          )}
        </div>

        {/* Pay Link */}
        {msg.payLink && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-[280px] sm:max-w-sm rounded-2xl p-4 sm:p-5 space-y-2.5 sm:space-y-3 relative overflow-hidden theme-t"
            style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,107,43,0.2)', boxShadow: '0 12px 40px rgba(255,107,43,0.1)' }}>
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(255,107,43,0.12)' }} />
            <div className="flex items-center gap-2 text-kado-orange">
              <CreditCard size={16} />
              <span className="font-display font-bold text-xs sm:text-sm">Secure Guest Checkout</span>
            </div>
            <p className="text-[10px] sm:text-xs" style={{ color: 'var(--text-secondary)' }}>Your order is ready — pay securely on Kapruka.com.</p>
            <a href={msg.payLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 sm:py-3 text-white font-display font-bold text-xs sm:text-sm rounded-xl shadow-xl btn-primary relative z-10">
              <span className="relative z-10 flex items-center gap-2">Pay via Kapruka <ExternalLink size={13} /></span>
            </a>
          </motion.div>
        )}

        {/* Order Confirmation */}
        {msg.orderNumber && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-[280px] sm:max-w-sm rounded-2xl p-4 sm:p-5 space-y-2.5 sm:space-y-3 theme-t"
            style={{ background: 'var(--bg-card)', border: '1px solid rgba(16,185,129,0.25)', boxShadow: '0 12px 40px rgba(16,185,129,0.08)' }}>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle size={16} />
              <span className="font-display font-bold text-xs sm:text-sm">Order Created!</span>
            </div>
            <div className="rounded-xl p-2.5 sm:p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
              <span className="text-[8px] sm:text-[9px] block uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Reference</span>
              <span className="font-display font-bold text-base sm:text-lg gradient-text">#{msg.orderNumber}</span>
            </div>
          </motion.div>
        )}

        {/* Products */}
        {msg.products && msg.products.length > 0 && <ProductCarousel products={msg.products} onSend={onSend} />}
      </div>
    </motion.div>
  );
}
