import { useState, useEffect } from 'react';
import { checkDelivery } from '../lib/kapruka-mcp';
import { format, addDays } from 'date-fns';
import { Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import type { CartItem } from '../types';

export default function DeliveryCalendar({
  city,
  selectedDate,
  onSelectDate,
  cartItems,
}: {
  city: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  cartItems: CartItem[];
}) {
  const [loading, setLoading] = useState(false);
  const [datesStatus, setDatesStatus] = useState<Array<{ dateStr: string; dateObj: Date; available: boolean; cost?: number; error?: boolean }>>([]);
  const [hasPerishables, setHasPerishables] = useState(false);

  useEffect(() => {
    // Check if the cart contains cakes or flowers (perishables)
    const perishable = cartItems.some(item => {
      const cat = item.product.category?.toLowerCase() || '';
      return cat === 'cakes' || cat === 'flowers';
    });
    setHasPerishables(perishable);
  }, [cartItems]);

  useEffect(() => {
    if (!city) return;

    async function loadAvailability() {
      setLoading(true);
      const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i + 1));
      const statuses = [];

      for (const dateObj of next7Days) {
        const dateStr = format(dateObj, 'yyyy-MM-dd');
        try {
          // Check delivery capability
          // We pass the first product in cart to check delivery constraints if exists
          const pid = cartItems[0]?.product.id;
          const res = await checkDelivery(city, dateStr, pid);
          
          statuses.push({
            dateStr,
            dateObj,
            available: res.status !== 'UNAVAILABLE' && res.status !== false && !res.error,
            cost: res.cost || res.delivery_cost || 0
          });
        } catch {
          statuses.push({
            dateStr,
            dateObj,
            available: true, // Default to true fallback
            cost: 350
          });
        }
      }

      setDatesStatus(statuses);
      setLoading(false);
    }

    loadAvailability();
  }, [city, cartItems]);

  if (!city) {
    return (
      <div className="p-4 bg-kado-surface rounded-2xl text-center border border-white/5">
        <p className="text-xs text-white/50">Please specify a delivery city to view calendar availability.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-white/80 font-bold">
          <Calendar size={14} className="text-kado-orange" />
          Select Delivery Date
        </div>
        {hasPerishables && (
          <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
            <AlertTriangle size={10} />
            Perishable item constraints
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 bg-kado-surface rounded-2xl border border-white/5">
          <Loader2 size={20} className="text-kado-orange animate-spin" />
          <span className="text-xs text-white/50 ml-2">Checking Kapruka schedule...</span>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {datesStatus.map((status) => {
            const isSelected = selectedDate === status.dateStr;
            return (
              <button
                key={status.dateStr}
                onClick={() => status.available && onSelectDate(status.dateStr)}
                disabled={!status.available}
                className={`flex flex-col items-center p-2 rounded-xl transition-all border ${
                  isSelected
                    ? 'bg-kado-orange border-kado-orange text-white shadow-lg shadow-kado-orange/20'
                    : status.available
                    ? 'bg-kado-surface border-white/5 hover:border-kado-orange/30 text-white/80'
                    : 'bg-kado-dark border-transparent text-white/20 cursor-not-allowed'
                }`}
              >
                <span className="text-[10px] text-kado-muted font-bold block uppercase">
                  {format(status.dateObj, 'EEE')}
                </span>
                <span className="text-xs font-display font-bold block mt-1">
                  {format(status.dateObj, 'd')}
                </span>
                {status.available && status.cost !== undefined && (
                  <span className={`text-[8px] block mt-1 ${isSelected ? 'text-white/80' : 'text-kado-gold'}`}>
                    LKR {status.cost}
                  </span>
                )}
                {!status.available && (
                  <span className="text-[7px] text-red-500/80 font-extrabold uppercase mt-1">
                    Closed
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
