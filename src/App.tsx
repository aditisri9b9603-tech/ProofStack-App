/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { Landing } from './pages/Landing';
import { Onboarding } from './pages/Onboarding';
import { StudentDashboard } from './pages/StudentDashboard';
import { RecruiterDashboard } from './pages/RecruiterDashboard';
import { Chatbot } from './components/Chatbot';
import { useEffect, useState } from 'react';
import { useApi } from './context/ApiContext';
import { Loader2 } from 'lucide-react';

function DashboardRouter() {
  const { user } = useAuth();
  const { fetchApi } = useApi();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const res = await fetchApi('/api/me');
        setProfile(res.profile);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (user) checkProfile();
  }, [user, fetchApi]);

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

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div className="min-h-screen flex flex-col font-sans relative overflow-x-hidden bg-offwhite">
            {/* Global background effects */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-accent/10 blur-[100px]" />
            </div>

            <Navigation />
            <main className="flex-grow flex flex-col relative z-10">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <DashboardRouter />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </main>
            <Chatbot />
            <Footer />
          </div>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}
