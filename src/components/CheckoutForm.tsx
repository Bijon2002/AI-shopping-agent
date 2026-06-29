import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { listDeliveryCities, createOrder } from '../lib/kapruka-mcp';
import DeliveryCalendar from './DeliveryCalendar';
import GiftComposer from './GiftComposer';
import { Loader2, Search, MapPin, Phone, User, Sparkles, AlertCircle, Bookmark } from 'lucide-react';
import type { CartItem, OrderPayload } from '../types';
import { useStore } from '../store';
import { translations } from '../lib/translations';

export default function CheckoutForm({
  cartItems,
  onComplete,
}: {
  cartItems: CartItem[];
  onComplete: (payUrl: string, orderNumber: string) => void;
}) {
  const { language, savedAddresses, savedPeople } = useStore();
  const t = translations[language] || translations.en;

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [searchingCities, setSearchingCities] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [address, setAddress] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [senderName, setSenderName] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  useEffect(() => {
    if (cityInput.length < 2 || cityInput === selectedCity) { setCitySuggestions([]); return; }
    const timer = setTimeout(async () => {
      setSearchingCities(true);
      try {
        const res = await listDeliveryCities(cityInput);
        if (res?.cities) {
          setCitySuggestions(res.cities.map((c: any) => typeof c === 'string' ? c : c.name || '').slice(0, 5));
        } else if (Array.isArray(res)) {
          setCitySuggestions(res.slice(0, 5));
        }
      } catch {}
      setSearchingCities(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [cityInput, selectedCity]);

  const selectCity = (city: string) => { setSelectedCity(city); setCityInput(city); setCitySuggestions([]); setShowCityDropdown(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName || !recipientPhone || !selectedCity || !address || !selectedDate || !senderName) {
      setError('Please fill in all required fields!'); return;
    }
    setError(''); setLoading(true);
    const payload: OrderPayload = {
      cart: cartItems.map(item => ({ product_id: item.product.id, quantity: item.qty })),
      recipient: { name: recipientName, phone: recipientPhone },
      delivery: { city: selectedCity, address, date: selectedDate },
      sender: { name: senderName, anonymous: false },
      gift_message: giftMessage || undefined,
    };
    try {
      const res = await createOrder(payload);
      if (res?.pay_url) onComplete(res.pay_url, res.order_number || 'KAD-' + Date.now().toString().slice(-6));
      else setError(res?.error || 'Could not process order.');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally { setLoading(false); }
  };

  const inputCls = "w-full py-2.5 rounded-xl text-xs focus:outline-none transition-all placeholder:text-[var(--text-muted)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-5 overflow-y-auto max-h-[80vh]" style={{ scrollbarWidth: 'thin' }}>
      {error && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }}
          className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </motion.div>
      )}

      {/* Section 1 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5C)' }}>1</span>
            <h3 className="text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>{t.recipientSection}</h3>
          </div>
        </div>

        {/* Quick select saved recipient */}
        {savedPeople.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white/[0.02] border border-white/5 items-center">
            <Bookmark size={11} className="text-Kapruka-orange ml-1" />
            <span className="text-[9px] text-white/40 uppercase mr-1">{t.useSavedProfile}:</span>
            {savedPeople.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => setRecipientName(person.name)}
                className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] hover:bg-Kapruka-orange/15 hover:border-Kapruka-orange transition-all font-semibold"
              >
                {person.name} ({person.relation})
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{t.nameLabel}</label>
            <div className="relative input-glow rounded-xl">
              <User size={12} className="absolute left-3 top-3" style={{ color: 'var(--text-muted)' }} />
              <input type="text" required value={recipientName} onChange={e => setRecipientName(e.target.value)}
                placeholder={t.nameLabel} className={`${inputCls} pl-8 pr-3`}
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{t.phoneLabel}</label>
            <div className="relative input-glow rounded-xl">
              <Phone size={12} className="absolute left-3 top-3" style={{ color: 'var(--text-muted)' }} />
              <input type="tel" required value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)}
                placeholder={t.phonePlaceholder} className={`${inputCls} pl-8 pr-3`}
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5C)' }}>2</span>
            <h3 className="text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>{t.deliverySection}</h3>
          </div>
        </div>

        {/* Quick select saved address */}
        {savedAddresses.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white/[0.02] border border-white/5 items-center">
            <Bookmark size={11} className="text-Kapruka-orange ml-1" />
            <span className="text-[9px] text-white/40 uppercase mr-1">{t.useSavedAddress}:</span>
            {savedAddresses.map((addr) => (
              <button
                key={addr.id}
                type="button"
                onClick={() => {
                  setRecipientName(addr.name);
                  setRecipientPhone(addr.phone);
                  setAddress(addr.street);
                  setSelectedCity(addr.city);
                  setCityInput(addr.city);
                }}
                className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] hover:bg-Kapruka-orange/15 hover:border-Kapruka-orange transition-all font-semibold"
              >
                {addr.name} - {addr.city}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2.5">
          <div className="relative">
            <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>{t.cityLabel}</label>
            <div className="relative input-glow rounded-xl">
              <Search size={12} className="absolute left-3 top-3" style={{ color: 'var(--text-muted)' }} />
              <input type="text" required value={cityInput}
                onChange={e => { setCityInput(e.target.value); setShowCityDropdown(true); }}
                onFocus={() => setShowCityDropdown(true)}
                placeholder="Colombo, Kandy…" className={`${inputCls} pl-8 pr-3`}
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
              {searchingCities && <Loader2 size={12} className="absolute right-3 top-3 text-Kapruka-orange animate-spin" />}
            </div>
            {showCityDropdown && citySuggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-xl shadow-2xl overflow-hidden glass">
                {citySuggestions.map((city, i) => (
                  <button key={i} type="button" onClick={() => selectCity(city)}
                    className="w-full text-left px-3 py-2.5 text-xs transition-all hover:bg-Kapruka-orange/15"
                    style={{ color: 'var(--text-secondary)' }}>{city}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>{t.addressLabel}</label>
            <div className="relative input-glow rounded-xl">
              <MapPin size={12} className="absolute left-3 top-3" style={{ color: 'var(--text-muted)' }} />
              <input type="text" required value={address} onChange={e => setAddress(e.target.value)}
                placeholder={t.addressPlaceholder} className={`${inputCls} pl-8 pr-3`}
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
            </div>
          </div>
          <DeliveryCalendar city={selectedCity} selectedDate={selectedDate} onSelectDate={setSelectedDate} cartItems={cartItems} />
        </div>
      </div>

      {/* Section 3 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5C)' }}>3</span>
          <h3 className="text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>{t.senderSection}</h3>
        </div>
        <div className="space-y-2.5">
          <div>
            <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>{t.yourNameLabel}</label>
            <input type="text" required value={senderName} onChange={e => setSenderName(e.target.value)}
              placeholder={t.yourNameLabel} className={`${inputCls} px-3 input-glow`}
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
          </div>
          <GiftComposer value={giftMessage} onChange={setGiftMessage} />
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        type="submit" disabled={loading}
        className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 text-white font-display font-extrabold text-sm rounded-xl shadow-xl btn-primary disabled:opacity-40 relative overflow-hidden"
      >
        <span className="relative z-10 flex items-center gap-2">
          {loading ? <><Loader2 size={16} className="animate-spin" /> {t.creatingOrder}</> : <><Sparkles size={16} /> {t.placeOrder}</>}
        </span>
      </motion.button>
    </form>
  );
}

