import { useState, useEffect } from 'react';
import { listDeliveryCities, createOrder } from '../lib/kapruka-mcp';
import DeliveryCalendar from './DeliveryCalendar';
import GiftComposer from './GiftComposer';
import { Loader2, Search, MapPin, Phone, User, Mail, Sparkles } from 'lucide-react';
import type { CartItem, OrderPayload } from '../types';

export default function CheckoutForm({
  cartItems,
  onComplete,
}: {
  cartItems: CartItem[];
  onComplete: (payUrl: string, orderNumber: string) => void;
}) {

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
  const [senderEmail, setSenderEmail] = useState('');
  const [giftMessage, setGiftMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle City Autocomplete Search
  useEffect(() => {
    if (cityInput.length < 2 || cityInput === selectedCity) {
      setCitySuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingCities(true);
      try {
        const res = await listDeliveryCities(cityInput);
        if (res?.cities) {
          // Sometimes it returns array of strings, sometimes array of objects
          const citiesList = res.cities.map((c: any) => typeof c === 'string' ? c : c.name || '');
          setCitySuggestions(citiesList.slice(0, 5));
        } else if (Array.isArray(res)) {
          setCitySuggestions(res.slice(0, 5));
        }
      } catch {
        // Fallback or ignore
      }
      setSearchingCities(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [cityInput, selectedCity]);

  const selectCity = (city: string) => {
    setSelectedCity(city);
    setCityInput(city);
    setCitySuggestions([]);
    setShowCityDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName || !recipientPhone || !selectedCity || !address || !selectedDate || !senderName || !senderEmail) {
      setError('Aney machan, please fill in all required fields!');
      return;
    }

    setError('');
    setLoading(true);

    const payload: OrderPayload = {
      cart: cartItems.map(item => ({
        product_id: item.product.id,
        quantity: item.qty
      })),
      recipient: {
        name: recipientName,
        phone: recipientPhone
      },
      delivery: {
        city: selectedCity,
        address: address,
        date: selectedDate
      },
      sender: {
        name: senderName,
        email: senderEmail
      },
      gift_message: giftMessage || undefined
    };

    try {
      const res = await createOrder(payload);
      if (res?.pay_url) {
        onComplete(res.pay_url, res.order_number || 'KAD-' + Date.now().toString().slice(-6));
      } else {
        setError(res?.error || 'Could not process order. Try again machang.');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 text-white overflow-y-auto max-h-[80vh] scrollbar-none">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/35 text-red-400 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Recipient Details */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase font-bold text-kado-orange tracking-wider">1. Recipient Info</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-white/50 block">Recipient Name *</label>
            <div className="relative">
              <User size={12} className="absolute left-3 top-3 text-white/30" />
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Recipient name"
                className="w-full pl-8 pr-3 py-2 bg-kado-surface border border-white/5 focus:border-kado-orange/30 rounded-xl text-xs text-white placeholder-white/20 focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-white/50 block">Recipient Phone *</label>
            <div className="relative">
              <Phone size={12} className="absolute left-3 top-3 text-white/30" />
              <input
                type="tel"
                required
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="e.g. 0771234567"
                className="w-full pl-8 pr-3 py-2 bg-kado-surface border border-white/5 focus:border-kado-orange/30 rounded-xl text-xs text-white placeholder-white/20 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Details */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs uppercase font-bold text-kado-orange tracking-wider">2. Delivery Destination</h3>
        <div className="space-y-2">
          {/* Live Autocomplete City Input */}
          <div className="space-y-1 relative">
            <label className="text-[10px] text-white/50 block">City *</label>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-3 text-white/30" />
              <input
                type="text"
                required
                value={cityInput}
                onChange={(e) => {
                  setCityInput(e.target.value);
                  setShowCityDropdown(true);
                }}
                onFocus={() => setShowCityDropdown(true)}
                placeholder="Type city (e.g. Colombo, Kandy)"
                className="w-full pl-8 pr-3 py-2 bg-kado-surface border border-white/5 focus:border-kado-orange/30 rounded-xl text-xs text-white placeholder-white/20 focus:outline-none"
              />
              {searchingCities && (
                <Loader2 size={12} className="absolute right-3 top-3 text-kado-orange animate-spin" />
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showCityDropdown && citySuggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-kado-card border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                {citySuggestions.map((city, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectCity(city)}
                    className="w-full text-left px-3 py-2 hover:bg-kado-orange/20 text-xs transition-all text-white/80"
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-white/50 block">Address *</label>
            <div className="relative">
              <MapPin size={12} className="absolute left-3 top-3 text-white/30" />
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House number, street name"
                className="w-full pl-8 pr-3 py-2 bg-kado-surface border border-white/5 focus:border-kado-orange/30 rounded-xl text-xs text-white placeholder-white/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Delivery Date Picker Calendar */}
          <DeliveryCalendar
            city={selectedCity}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            cartItems={cartItems}
          />
        </div>
      </div>

      {/* Sender Info & Gift Composer */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs uppercase font-bold text-kado-orange tracking-wider">3. Sender Info & Gift Message</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-white/50 block">Sender Name *</label>
            <input
              type="text"
              required
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 bg-kado-surface border border-white/5 focus:border-kado-orange/30 rounded-xl text-xs text-white placeholder-white/20 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-white/50 block">Sender Email *</label>
            <div className="relative">
              <Mail size={12} className="absolute left-3 top-3 text-white/30" />
              <input
                type="email"
                required
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full pl-8 pr-3 py-2 bg-kado-surface border border-white/5 focus:border-kado-orange/30 rounded-xl text-xs text-white placeholder-white/20 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Gift Message Composer */}
        <GiftComposer value={giftMessage} onChange={setGiftMessage} />
      </div>

      {/* Submit Order Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-kado-orange to-amber-500 hover:from-kado-orange/95 hover:to-amber-500/95 text-white font-display font-extrabold text-sm rounded-xl shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-95 shadow-kado-orange/20"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creating Order...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Generate Checkout Order
          </>
        )}
      </button>
    </form>
  );
}
