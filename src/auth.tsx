import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Activity, ArrowRight, AudioLines, CircleAlert, LockKeyhole, Mail, PhoneIncoming, PhoneOutgoing, UserRound, Eye, EyeOff } from 'lucide-react';
import { AHamsonLogo, ThemeToggle } from './branding';
import './auth.css';

const demoEmail = 'admin@gmail.com';
const demoPassword = 'admin123';

function SignInForm({ onLogin }: { onLogin: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    if (String(fields.get('email')).trim().toLowerCase() === demoEmail && fields.get('password') === demoPassword) {
      onLogin();
    } else {
      setError(true);
    }
  }

  return <>
    <form className="auth-fields" onSubmit={submit} onChange={() => setError(false)} aria-describedby={error ? 'login-error' : undefined}>
      <label htmlFor="login-email">Email address</label>
      <div className="auth-input">
        <Mail size={17} aria-hidden="true" />
        <input id="login-email" name="email" type="email" autoComplete="username" placeholder="you@example.com" required aria-invalid={error || undefined} />
      </div>
      <label htmlFor="login-password">Password</label>
      <div className="auth-input has-action">
        <LockKeyhole size={17} aria-hidden="true" />
        <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" required aria-invalid={error || undefined} />
        <button type="button" className="icon-button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(current => !current)}>
          {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
      {error && <p id="login-error" className="auth-error" role="alert"><CircleAlert size={16} aria-hidden="true" /> Email or password is incorrect.</p>}
      <button type="submit" className="button primary auth-submit">Sign in <ArrowRight size={17} aria-hidden="true" /></button>
    </form>
    <p className="auth-alternate"><a className="text-link" href="#signup">Sign up</a></p>
  </>;
}

function SignUpPreview() {
  return <>
    <fieldset className="auth-fields" disabled>
      <legend className="sr-only">Registration preview</legend>
      <label htmlFor="signup-name">Full name</label>
      <div className="auth-input"><UserRound size={17} aria-hidden="true" /><input id="signup-name" placeholder="Your full name" /></div>
      <label htmlFor="signup-email">Email address</label>
      <div className="auth-input"><Mail size={17} aria-hidden="true" /><input id="signup-email" type="email" placeholder="you@example.com" /></div>
      <label htmlFor="signup-password">Password</label>
      <div className="auth-input"><LockKeyhole size={17} aria-hidden="true" /><input id="signup-password" type="password" placeholder="Choose a password" /></div>
      <button type="button" className="button primary auth-submit">Create account <ArrowRight size={17} aria-hidden="true" /></button>
    </fieldset>
    <p className="auth-alternate">Already have access? <a className="text-link" href="#login">Sign in</a></p>
  </>;
}

function WorkspaceVisual() {
  return <div className="auth-visual">
    <div className="auth-visual-copy">
      <h2>Pakistan's International Voice Traffic Dashboard</h2>
      <p>Voice traffic analysis platform</p>
    </div>
    <div className="auth-signal-frame" aria-hidden="true">
      <div className="auth-signal">
        <div className="auth-orbit" />
        <div className="auth-orbit inner" />
        <div className="auth-signal-hub"><AudioLines size={65} strokeWidth={1.6} /></div>
        <div className="auth-signal-node incoming"><PhoneIncoming size={24} strokeWidth={1.7} /></div>
        <div className="auth-signal-node outgoing"><PhoneOutgoing size={24} strokeWidth={1.7} /></div>
        <div className="auth-signal-node activity"><Activity size={22} strokeWidth={1.7} /></div>
      </div>
    </div>
  </div>;
}

export function AuthScreen({ signup, onToggleTheme, onLogin }: { signup: boolean; onToggleTheme: () => void; onLogin: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = (signup ? 'Sign up' : 'Sign in') + ' | AHamson';
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [signup]);

  return <main className="auth-shell">
    <div className="auth-pane">
      <header className="auth-header">
        <div className="auth-brand"><AHamsonLogo /></div>
        <ThemeToggle onToggle={onToggleTheme} />
      </header>
      <section className="auth-content" aria-labelledby="auth-title">
        <h1 id="auth-title" ref={heading} tabIndex={-1}>{signup ? 'Sign up' : 'Sign in'}</h1>
        <p className="auth-intro">{signup ? 'Preview registration for the AHamson workspace.' : 'Access Pakistan’s international voice traffic dashboard.'}</p>
        {signup ? <SignUpPreview /> : <SignInForm onLogin={onLogin} />}
      </section>
    </div>
    <WorkspaceVisual />
  </main>;
}
