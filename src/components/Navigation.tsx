import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Settings } from 'lucide-react';
import { useState } from 'react';
import { SettingsModal } from './SettingsModal';

export function Navigation() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <nav className="sticky top-0 w-full h-16 bg-white/80 backdrop-blur-md border-b border-primary/10 px-4 sm:px-8 flex items-center justify-between z-50 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-inner">
          <div className="w-4 h-4 border-2 border-white rounded-sm rotate-45"></div>
        </div>
        <Link to="/" className="font-serif text-2xl font-bold text-dark tracking-tight hover:text-primary transition-colors">
          ProofStack
        </Link>
      </div>
      
      <div className="hidden md:flex items-center gap-8 text-sm font-medium h-full">
        <Link to="/leaderboard" className={`h-full flex items-center border-b-2 transition-all ${location.pathname === '/leaderboard' ? 'text-primary border-primary' : 'text-muted hover:text-primary border-transparent'}`}>
          Leaderboard
        </Link>
        {user && (
          <>
            <Link to="/dashboard" className={`h-full flex items-center border-b-2 transition-all ${location.pathname === '/dashboard' ? 'text-primary border-primary' : 'text-muted hover:text-primary border-transparent'}`}>
              Dashboard
            </Link>
            <a href="#" className="text-muted hover:text-primary h-full flex items-center border-b-2 border-transparent transition-all">Skill Challenges</a>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-muted hover:text-primary transition-colors p-2 rounded-full hover:bg-black/5"
              aria-label="Settings"
            >
              <Settings size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-3 bg-white/60 backdrop-blur-sm py-1.5 px-3 rounded-full border border-primary/20 shadow-sm">
              <div className="text-right">
                <p className="text-xs font-bold leading-none text-dark">{user.displayName || user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-muted leading-none mt-1 truncate max-w-[100px]">{user.email}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-secondary border-2 border-white overflow-hidden shadow-sm flex items-center justify-center text-white font-bold text-xs">
                {user.displayName?.[0] || user.email?.[0]?.toUpperCase()}
              </div>
            </div>
            
            <button
              onClick={logout}
              className="flex items-center gap-2 text-xs font-bold text-muted hover:text-primary transition-colors uppercase tracking-wider p-2 rounded-lg hover:bg-black/5"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm font-bold text-ink hover:text-primary transition-colors">
              Log In
            </Link>
          </div>
        )}
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </nav>
  );
}
