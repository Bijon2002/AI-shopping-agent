import ChatShell from './components/ChatShell';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <ChatShell />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#242424',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            fontSize: '13px',
            fontFamily: 'var(--font-body)',
          },
        }}
      />
    </>
  );
}

export default App;
