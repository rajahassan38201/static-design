import { useContext } from 'react';
import { Moon, Sun } from 'lucide-react';
import voxiaLogo from '../VOXIA Logo.png';
import ahamsonLogo from '../Ahamson logo.png';
import { ThemeContext } from './theme';

export function VoxiaLogo() {
  return <span className="brand-logo">
    <img className="brand-logo-art" src={voxiaLogo} alt="VOXIA" width="2172" height="724" />
    <img className="brand-logo-wordmark" src={voxiaLogo} alt="" aria-hidden="true" width="2172" height="724" />
  </span>;
}

export function CompanyLogo() {
  return <span className="company-logo"><img src={ahamsonLogo} alt="AHamson" width="447" height="447" /></span>;
}

export function ThemeToggle({ onToggle }: { onToggle: () => void }) {
  const dark = useContext(ThemeContext) === 'dark';
  return <button type="button" className="icon-button theme-toggle" role="switch" aria-label="Dark mode" aria-checked={dark} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={onToggle}>
    {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
  </button>;
}
