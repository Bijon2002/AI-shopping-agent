import { motion } from 'framer-motion';
import { Package, CheckCircle2, Clock, MapPin } from 'lucide-react';

export default function OrderTracker({ data }: { data: any }) {
  if (!data || !data.order_number) return null;

  const steps = data.progress || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[320px] sm:max-w-md rounded-2xl p-4 sm:p-5 space-y-4 theme-t"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.05)'
      }}
    >
      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-Kapruka-orange">
            Order #{data.order_number}
          </span>
          <h3 className="font-display font-bold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
            {data.status_display || data.status || 'Processing'}
          </h3>
        </div>
        <div className="p-2 rounded-full" style={{ background: 'rgba(255,107,43,0.1)', color: 'var(--Kapruka-orange)' }}>
          <Package size={20} className="text-Kapruka-orange" />
        </div>
      </div>

      {/* Timeline */}
      <div className="py-2 pl-2 space-y-4 relative">
        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 rounded-full" style={{ background: 'var(--border-default)' }} />
        
        {steps.map((step: any, idx: number) => {
          const isLast = idx === steps.length - 1;
          return (
            <div key={idx} className="flex gap-4 relative z-10">
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center flex-none mt-0.5"
                style={{ 
                  background: isLast ? 'linear-gradient(135deg, #FF6B2B, #FF8F5C)' : 'var(--bg-elevated)',
                  color: isLast ? '#fff' : 'var(--text-muted)',
                  border: isLast ? 'none' : '1px solid var(--border-default)'
                }}
              >
                {isLast ? <CheckCircle2 size={14} /> : <CheckCircle2 size={14} />}
              </div>
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-bold" style={{ color: isLast ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {step.step}
                </p>
                {step.timestamp && (
                  <p className="text-[10px] sm:text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={10} /> {new Date(step.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delivery details summary */}
      <div className="rounded-xl p-3 flex gap-3 text-xs sm:text-sm" style={{ background: 'var(--bg-elevated)' }}>
        <MapPin size={16} className="text-Kapruka-orange flex-none mt-0.5" />
        <div style={{ color: 'var(--text-secondary)' }}>
          <p className="font-bold text-Kapruka-orange">{data.delivery_date}</p>
          {data.recipient && (
            <p className="mt-0.5">{data.recipient.name} • {data.recipient.city}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
