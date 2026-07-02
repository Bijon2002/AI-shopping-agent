import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, MapPin, User, Heart, DollarSign } from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../lib/translations';

export default function ProfileDrawer() {
  const {
    language,
    profileOpen,
    setProfileOpen,
    savedAddresses,
    addSavedAddress,
    deleteSavedAddress,
    savedPeople,
    addSavedPerson,
    deleteSavedPerson,
    preferences,
    updatePreferences
  } = useStore();

  const [activeTab, setActiveTab] = useState<'recipients' | 'addresses' | 'preferences'>('recipients');
  
  // Form states
  const [personName, setPersonName] = useState('');
  const [personRelation, setPersonRelation] = useState('');
  const [personBday, setPersonBday] = useState('');
  const [showAddPerson, setShowAddPerson] = useState(false);

  const [addrName, setAddrName] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [showAddAddr, setShowAddAddr] = useState(false);

  const t = translations[language] || translations.en;

  if (!profileOpen) return null;

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName || !personRelation) return;
    addSavedPerson({
      id: crypto.randomUUID(),
      name: personName,
      relation: personRelation,
      birthday: personBday || undefined
    });
    setPersonName('');
    setPersonRelation('');
    setPersonBday('');
    setShowAddPerson(false);
  };

  const handleAddAddr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrName || !addrStreet || !addrCity || !addrPhone) return;
    addSavedAddress({
      id: crypto.randomUUID(),
      name: addrName,
      street: addrStreet,
      city: addrCity,
      phone: addrPhone
    });
    setAddrName('');
    setAddrStreet('');
    setAddrCity('');
    setAddrPhone('');
    setShowAddAddr(false);
  };

  const handleDietaryToggle = (diet: string) => {
    const current = preferences.dietary || [];
    const next = current.includes(diet)
      ? current.filter(d => d !== diet)
      : [...current, diet];
    updatePreferences({ dietary: next });
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setProfileOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Drawer Body */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative w-full max-w-[420px] h-full flex flex-col z-10 glass shadow-[0_0_50px_rgba(0,0,0,0.5)] theme-t"
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
      >
        {/* Header */}
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2">
            <User size={18} className="text-Kapruka-orange animate-pulse" />
            <h2 className="font-display font-black text-sm uppercase tracking-wider">{t.profile}</h2>
          </div>
          <button
            onClick={() => setProfileOpen(false)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-4 flex gap-1.5" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
          {[
            { id: 'recipients', label: t.savedPeople },
            { id: 'addresses', label: t.savedAddresses },
            { id: 'preferences', label: t.preferences }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-t-xl transition-all ${
                activeTab === tab.id
                  ? 'text-Kapruka-orange border-t-2 border-Kapruka-orange'
                  : 'hover:opacity-80'
              }`}
              style={{
                background: activeTab === tab.id ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === tab.id ? undefined : 'var(--text-muted)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5">
          
          {/* TAB 1: RECIPIENTS */}
          {activeTab === 'recipients' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/50">
                  {savedPeople.length} {t.savedPeople}
                </span>
                {!showAddPerson && (
                  <button
                    onClick={() => setShowAddPerson(true)}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-Kapruka-orange hover:opacity-80"
                  >
                    <Plus size={12} /> {t.addPerson}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {showAddPerson && (
                  <motion.form
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleAddPerson}
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3 overflow-hidden"
                  >
                    <div>
                      <label className="text-[9px] font-bold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>{t.nameLabel}</label>
                      <input
                        type="text"
                        required
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        placeholder={t.namePlaceholder}
                        className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-Kapruka-orange"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>{t.relation}</label>
                      <input
                        type="text"
                        required
                        value={personRelation}
                        onChange={(e) => setPersonRelation(e.target.value)}
                        placeholder={t.relationPlaceholder}
                        className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-Kapruka-orange"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>{t.birthday}</label>
                      <input
                        type="date"
                        value={personBday}
                        onChange={(e) => setPersonBday(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-Kapruka-orange"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div className="flex gap-2 pt-1.5">
                      <button
                        type="submit"
                        className="flex-1 py-2 rounded-lg bg-Kapruka-orange text-[10px] font-bold uppercase tracking-wider text-white"
                      >
                        {t.save}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddPerson(false)}
                        className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {savedPeople.map((person) => (
                  <div
                    key={person.id}
                    className="p-3.5 rounded-xl flex items-center justify-between transition-colors"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                        <Heart size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{person.name}</div>
                        <div className="text-[10px] flex gap-2" style={{ color: 'var(--text-muted)' }}>
                          <span>{person.relation}</span>
                          {person.birthday && (
                            <>
                              <span>•</span>
                              <span>🎂 {person.birthday}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSavedPerson(person.id)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {savedPeople.length === 0 && !showAddPerson && (
                  <div className="text-center py-8 text-xs" style={{ color: 'var(--text-muted)' }}>
                    No recipients saved yet. Add friends or family you frequently buy gifts for!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/50">
                  {savedAddresses.length} {t.savedAddresses}
                </span>
                {!showAddAddr && (
                  <button
                    onClick={() => setShowAddAddr(true)}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-Kapruka-orange hover:opacity-80"
                  >
                    <Plus size={12} /> {t.addAddress}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {showAddAddr && (
                  <motion.form
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleAddAddr}
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3 overflow-hidden"
                  >
                    <div>
                      <label className="text-[9px] font-bold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Recipient Name *</label>
                      <input
                        type="text"
                        required
                        value={addrName}
                        onChange={(e) => setAddrName(e.target.value)}
                        placeholder="e.g. Amma's house"
                        className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-Kapruka-orange"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>{t.street} *</label>
                      <input
                        type="text"
                        required
                        value={addrStreet}
                        onChange={(e) => setAddrStreet(e.target.value)}
                        placeholder={t.addressPlaceholder}
                        className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-Kapruka-orange"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>{t.city} *</label>
                      <input
                        type="text"
                        required
                        value={addrCity}
                        onChange={(e) => setAddrCity(e.target.value)}
                        placeholder="e.g. Colombo, Kandy"
                        className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-Kapruka-orange"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>{t.phoneLabel}</label>
                      <input
                        type="tel"
                        required
                        value={addrPhone}
                        onChange={(e) => setAddrPhone(e.target.value)}
                        placeholder={t.phonePlaceholder}
                        className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-Kapruka-orange"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div className="flex gap-2 pt-1.5">
                      <button
                        type="submit"
                        className="flex-1 py-2 rounded-lg bg-Kapruka-orange text-[10px] font-bold uppercase tracking-wider text-white"
                      >
                        {t.save}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddAddr(false)}
                        className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {savedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-3.5 rounded-xl flex items-center justify-between transition-colors"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-Kapruka-orange/10 text-Kapruka-orange">
                        <MapPin size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{addr.name}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{addr.street}, {addr.city}</div>
                        <div className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>📞 {addr.phone}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSavedAddress(addr.id)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {savedAddresses.length === 0 && !showAddAddr && (
                  <div className="text-center py-8 text-xs" style={{ color: 'var(--text-muted)' }}>
                    No addresses saved yet. Add delivery locations to make checkouts faster!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-5">
              
              {/* Dietary Preferences */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                  {t.dietaryPrefs}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'eggless', label: t.eggless },
                    { id: 'vegetarian', label: t.vegetarian },
                    { id: 'nutfree', label: t.nutFree }
                  ].map((diet) => {
                    const active = (preferences.dietary || []).includes(diet.id);
                    return (
                      <button
                        key={diet.id}
                        type="button"
                        onClick={() => handleDietaryToggle(diet.id)}
                        className={`py-2 px-1 text-[10px] font-bold uppercase rounded-lg text-center transition-all ${
                          active
                            ? 'bg-Kapruka-orange/20 border-Kapruka-orange text-Kapruka-orange'
                            : 'hover:opacity-80'
                        }`}
                        style={{
                          background: active ? undefined : 'var(--bg-elevated)',
                          border: active ? '1px solid transparent' : '1px solid var(--border-default)',
                          color: active ? undefined : 'var(--text-secondary)'
                        }}
                      >
                        {diet.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Budget Range */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                  {t.budgetRange}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[9px] block mb-1" style={{ color: 'var(--text-muted)' }}>Min (LKR)</span>
                    <div className="relative">
                      <DollarSign size={10} className="absolute left-2.5 top-2.5 text-white/40" />
                      <input
                        type="number"
                        value={preferences.budgetMin || ''}
                        onChange={(e) => updatePreferences({ budgetMin: Number(e.target.value) })}
                        placeholder="0"
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg text-xs focus:outline-none"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] block mb-1" style={{ color: 'var(--text-muted)' }}>Max (LKR)</span>
                    <div className="relative">
                      <DollarSign size={10} className="absolute left-2.5 top-2.5 text-white/40" />
                      <input
                        type="number"
                        value={preferences.budgetMax || ''}
                        onChange={(e) => updatePreferences({ budgetMax: Number(e.target.value) })}
                        placeholder="10000"
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg text-xs focus:outline-none"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                  {t.notes}
                </label>
                <textarea
                  value={preferences.notes || ''}
                  onChange={(e) => updatePreferences({ notes: e.target.value })}
                  placeholder={t.notesPlaceholder}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-Kapruka-orange custom-scrollbar resize-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Info note */}
              <div className="p-3 rounded-xl text-[10px] leading-relaxed" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                💡 The AI assistant reads these preferences automatically to filter cake lists, recommend gifts within your budget, and mirror your shopping style.
              </div>

            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}
