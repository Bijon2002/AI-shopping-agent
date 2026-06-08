import { ThemeProvider } from './components/ThemeProvider';
import ChatShell from './components/ChatShell';
import { Toaster } from 'react-hot-toast';
import WhatsAppButton from './components/WhatsAppButton';

function App() {
  return (
    <ThemeProvider>
      <ChatShell />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            fontSize: '13px',
            fontFamily: 'var(--font-body)',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
      <WhatsAppButton />
    </ThemeProvider>
  );
}

export default App;
