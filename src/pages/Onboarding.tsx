import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../context/ApiContext';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Briefcase } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const { fetchApi } = useApi();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [role, setRole] = useState<'student' | 'recruiter' | null>(null);
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [collegeName, setCollegeName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    
    setLoading(true);
    try {
      await fetchApi('/api/profile', {
        method: 'POST',
        body: JSON.stringify({ fullName, role, collegeName }),
      });
      showToast('Profile saved successfully!', 'success');
      onComplete();
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      showToast('Failed to save profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-offwhite flex items-center justify-center p-4">
      <div className="bg-white rounded-[12px] shadow-lg border border-primary/10 w-full max-w-xl overflow-hidden p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-dark mb-2">Welcome to ProofStack</h1>
          <p className="text-muted">Let's set up your profile to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`p-6 rounded-[12px] border-2 flex flex-col items-center text-center gap-3 transition-all ${
                role === 'student' 
                  ? 'border-primary bg-primary/5 text-primary' 
                  : 'border-primary/10 bg-offwhite text-muted hover:border-primary/30'
              }`}
            >
              <GraduationCap size={32} />
              <div className="font-bold text-lg text-dark">I'm a Student</div>
              <div className="text-xs">I want to verify my skills and get hired.</div>
            </button>

            <button
              type="button"
              onClick={() => setRole('recruiter')}
              className={`p-6 rounded-[12px] border-2 flex flex-col items-center text-center gap-3 transition-all ${
                role === 'recruiter' 
                  ? 'border-primary bg-primary/5 text-primary' 
                  : 'border-primary/10 bg-offwhite text-muted hover:border-primary/30'
              }`}
            >
              <Briefcase size={32} />
              <div className="font-bold text-lg text-dark">I'm a Recruiter</div>
              <div className="text-xs">I want to find verified talent.</div>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-[8px] border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-offwhite"
                placeholder="John Doe"
              />
            </div>
            {role === 'student' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">College/University</label>
                <input
                  type="text"
                  required
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="w-full px-4 py-3 rounded-[8px] border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-offwhite"
                  placeholder="Indian Institute of Technology..."
                />
              </div>
            )}
            {role === 'recruiter' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="w-full px-4 py-3 rounded-[8px] border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-offwhite"
                  placeholder="Acme Corp"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!role || loading}
            className="w-full py-4 rounded-[12px] bg-primary text-white font-bold text-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:transform-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Saving...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
