import { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import './theme.css';
import './styles.css';
import { AuthScreen } from './auth';
import { ThemeContext, useThemePreference } from './theme';

const Dashboard = lazy(() => import('./dashboard'));
const sessionKey = 'voxia-demo-session';

function readSession() {
  try {
    return sessionStorage.getItem(sessionKey) === 'signed-in';
  } catch {
    return false;
  }
}

function App() {
  const { theme, toggleTheme } = useThemePreference();
  const [signedIn, setSignedIn] = useState(readSession);
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  function changeSession(next: boolean) {
    try {
      if (next) sessionStorage.setItem(sessionKey, 'signed-in');
      else sessionStorage.removeItem(sessionKey);
    } catch {
      // Sign-in and logout still work in memory when browser storage is disabled.
    }

    let nextHash = '#login';
    if (next) {
      const current = window.location.hash;
      nextHash = current && current !== '#login' && current !== '#signup' ? current : '#overview';
    }
    window.history.replaceState(window.history.state, '', nextHash);
    setHash(nextHash);
    setSignedIn(next);
    window.scrollTo({ top: 0 });
  }

  return <ThemeContext.Provider value={theme}>
    {signedIn
      ? <Suspense fallback={<div className="auth-loading" role="status">Loading dashboard…</div>}>
          <Dashboard hash={hash} onToggleTheme={toggleTheme} onLogout={() => changeSession(false)} />
        </Suspense>
      : <AuthScreen signup={hash === '#signup'} onToggleTheme={toggleTheme} onLogin={() => changeSession(true)} />}
  </ThemeContext.Provider>;
}

createRoot(document.getElementById('root')!).render(<App />);
