/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { Landing } from './pages/Landing';
import { Onboarding } from './pages/Onboarding';
import { StudentDashboard } from './pages/StudentDashboard';
import { RecruiterDashboard } from './pages/RecruiterDashboard';
import { Leaderboard } from './pages/Leaderboard';
import { Chatbot } from './components/Chatbot';
import { useEffect, useState } from 'react';
import { useApi } from './context/ApiContext';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Analytics } from '@vercel/analytics/react';

function DashboardRouter() {
  const { user } = useAuth();
  const { fetchApi } = useApi();
  const { setTheme } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const res = await fetchApi('/api/me');
        setProfile(res.profile);
        if (res.profile?.theme) {
          setTheme(res.profile.theme);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (user) checkProfile();
  }, [user, fetchApi, setTheme]);

  if (loading) return <div className="min-h-screen bg-offwhite flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!profile) return <Onboarding onComplete={() => window.location.reload()} />;
  
  if (profile.role === 'recruiter') {
    return <RecruiterDashboard profile={profile} />;
  }
  
  return <StudentDashboard profile={profile} />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-offwhite flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!user) return <Navigate to="/" />;
  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Landing /></PageWrapper>} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <PageWrapper><DashboardRouter /></PageWrapper>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/leaderboard" 
          element={<PageWrapper><Leaderboard /></PageWrapper>} 
        />
      </Routes>
    </AnimatePresence>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex-grow flex flex-col w-full"
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <Router>
            <div className="min-h-screen flex flex-col font-sans relative overflow-x-hidden transition-colors duration-500 bg-offwhite">
              {/* Global background effects - Motion Stage Theme */}
              <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <motion.div 
                  animate={{ 
                    x: [0, 100, -50, 0],
                    y: [0, -50, 100, 0],
                    scale: [1, 1.2, 0.9, 1] 
                  }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px] mix-blend-multiply opacity-70" 
                />
                <motion.div 
                  animate={{ 
                    x: [0, -100, 50, 0],
                    y: [0, 100, -50, 0],
                    scale: [1, 1.1, 0.8, 1] 
                  }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                  className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-accent/20 blur-[100px] mix-blend-multiply opacity-60" 
                />
                <motion.div 
                  animate={{ 
                    x: [0, 50, -100, 0],
                    y: [0, -100, 50, 0],
                    scale: [1, 1.3, 0.9, 1] 
                  }}
                  transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                  className="absolute top-[40%] left-[40%] w-[35vw] h-[35vw] rounded-full bg-secondary/15 blur-[100px] mix-blend-multiply opacity-50" 
                />
              </div>
              <div className="relative z-10 flex flex-col flex-grow">
                <Navigation />
                <main className="flex-grow flex flex-col relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8">
                  <AnimatedRoutes />
                </main>
                <Chatbot />
                <Footer />
              </div>
            </div>
            <Analytics />
          </Router>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
