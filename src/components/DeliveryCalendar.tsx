import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { checkDelivery } from '../lib/kapruka-mcp';
import { format, addDays } from 'date-fns';
import { Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import type { CartItem } from '../types';

export default function DeliveryCalendar({
  city, selectedDate, onSelectDate, cartItems,
}: {
  city: string; selectedDate: string; onSelectDate: (d: string) => void; cartItems: CartItem[];
}) {
  const [loading, setLoading] = useState(false);
  const [dates, setDates] = useState<Array<{ str: string; obj: Date; ok: boolean; cost?: number }>>([]);
  const [perishable, setPerishable] = useState(false);

  useEffect(() => {
    setPerishable(cartItems.some(i => ['cakes', 'flowers'].includes(i.product.category?.toLowerCase() || '')));
  }, [cartItems]);

  useEffect(() => {
    if (!city) return;
    (async () => {
      setLoading(true);
      const next7 = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i + 1));
      const result = [];
      for (const d of next7) {
        const str = format(d, 'yyyy-MM-dd');
        try {
          const r = await checkDelivery(city, str, cartItems[0]?.product.id);
          result.push({ str, obj: d, ok: r.status !== 'UNAVAILABLE' && r.status !== false && !r.error, cost: r.cost || r.delivery_cost || 0 });
        } catch { result.push({ str, obj: d, ok: true, cost: 350 }); }
      }
      setDates(result);
      setLoading(false);
    })();
  }, [city, cartItems]);

  if (!city) return (
    <div className="p-4 rounded-2xl text-center theme-t" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Select a city first to see delivery dates.</p>
    </div>
  );

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
          <Calendar size={14} className="text-kado-orange" /> Delivery Date
        </div>
        {perishable && (
          <span className="flex items-center gap-1 text-[9px] text-amber-400 font-bold px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
            <AlertTriangle size={9} /> Perishable
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <Loader2 size={18} className="text-kado-orange animate-spin" />
          <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>Checking schedule…</span>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {dates.map((d, i) => {
            const sel = selectedDate === d.str;
            return (
              <motion.button
                key={d.str}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => d.ok && onSelectDate(d.str)}
                disabled={!d.ok}
                type="button"
                className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${!d.ok ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'}`}
                style={
                  sel
                    ? { background: 'linear-gradient(135deg, #FF6B2B, #FF8F5C)', color: '#fff', boxShadow: '0 4px 20px rgba(255,107,43,0.3)' }
                    : { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }
                }
              >
                <span className="text-[9px] font-bold uppercase" style={{ color: sel ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                  {format(d.obj, 'EEE')}
                </span>
                <span className="text-xs font-display font-bold mt-0.5">{format(d.obj, 'd')}</span>
                {d.ok && d.cost !== undefined && (
                  <span className={`text-[7px] mt-0.5 ${sel ? 'text-white/70' : 'text-kado-gold'}`}>
                    {d.cost > 0 ? `LKR ${d.cost}` : 'Free'}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
