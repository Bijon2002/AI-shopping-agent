import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, MessageSquare, Trash2, CalendarDays } from 'lucide-react';
import { useStore } from '../store';

export default function HistoryDrawer() {
  const { sessions, setHistoryOpen, loadSession, deleteSession } = useStore();

  const sortedSessions = [...sessions].sort((a, b) => b.date - a.date);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setHistoryOpen(false)}
        className="fixed inset-0 z-40"
        style={{ background: 'var(--overlay)' }}
      />

      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed left-0 top-0 bottom-0 w-full max-w-[320px] z-50 flex flex-col theme-t"
        style={{
          background: 'var(--bg-base)',
          borderRight: '1px solid var(--border-default)',
          boxShadow: '20px 0 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div className="flex-none px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500">
              <Clock size={16} className="text-white" />
            </div>
            <h2 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Past Chats
            </h2>
          </div>
          <motion.button
            whileTap={{ scale: 0.9, rotate: 90 }}
            onClick={() => setHistoryOpen(false)}
            className="p-2 rounded-xl transition-colors theme-t"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </motion.button>
        </div>

        {sessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-surface)' }}>
              <MessageSquare size={28} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No past chats yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Start a new chat to begin saving history.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              <AnimatePresence>
                {sortedSessions.map((session, idx) => {
                  const dateStr = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date(session.date));
                  return (
                    <motion.div
                      key={session.id}
                      layout
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.05 }}
                      className="group rounded-xl p-3 theme-t cursor-pointer"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                      onClick={() => loadSession(session.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className="text-xs font-semibold line-clamp-2" style={{ color: 'var(--text-primary)' }}>{session.title}</h4>
                          <div className="flex items-center gap-1.5 mt-2">
                            <CalendarDays size={10} style={{ color: 'var(--text-muted)' }} />
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {dateStr}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-semibold ml-1">
                              {session.messages.length} msgs
                            </span>
                          </div>
                        </div>

                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
