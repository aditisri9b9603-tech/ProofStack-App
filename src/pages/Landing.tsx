import { ShieldCheck, Code, Trophy, Share2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export function Landing() {
  const { signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleAuth = async () => {
    try {
      if (user) {
        navigate('/dashboard');
      } else {
        await signInWithGoogle();
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error?.code === 'auth/popup-blocked') {
        showToast('Sign-in popup was blocked by your browser. Please allow popups for this site or open the app in a new tab.', 'error');
      } else if (error?.code === 'auth/cancelled-popup-request' || error?.code === 'auth/popup-closed-by-user') {
        showToast('Sign-in was cancelled. Please try again.', 'error');
      } else {
        showToast('Failed to sign in. Please try again or open the app in a new tab.', 'error');
      }
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-8">
          <ShieldCheck size={16} />
          <span>The new standard for verified talent</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-dark max-w-4xl mx-auto leading-tight mb-6">
          AI-Verified Skill Portfolios for a Placement-Ready India
        </h1>
        <p className="text-lg text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          Stop relying on static resumes. Connect your GitHub, let AI verify your real coding abilities, and stand out to top recruiters with cryptographically-backed skill cards.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={handleAuth}
            className="w-full sm:w-auto px-8 py-4 rounded-[12px] bg-primary text-white font-bold text-lg shadow-[0_8px_24px_rgba(2,128,144,0.3)] hover:shadow-[0_12px_32px_rgba(2,128,144,0.4)] hover:-translate-y-1 hover:bg-[#00A896] transition-all flex items-center justify-center gap-2"
          >
            Student Sign Up <ArrowRight size={20} />
          </button>
          <button 
            onClick={handleAuth}
            className="w-full sm:w-auto px-8 py-4 rounded-[12px] bg-white border-2 border-primary/20 text-dark font-bold text-lg hover:bg-offwhite transition-all"
          >
            Recruiter Login
          </button>
        </div>
      </section>

      {/* Stats/Trust Section */}
      <section className="bg-white py-16 border-y border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-primary/10">
            <div className="p-4">
              <div className="text-4xl font-serif font-black text-primary mb-2">94%</div>
              <div className="text-muted text-sm font-medium uppercase tracking-widest">Recruiter Struggle</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-serif font-black text-primary mb-2">5M+</div>
              <div className="text-muted text-sm font-medium uppercase tracking-widest">Lines of Code Analyzed</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-serif font-black text-primary mb-2">10x</div>
              <div className="text-muted text-sm font-medium uppercase tracking-widest">Faster Screening</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex-1">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-center text-dark mb-16">
          How Verification Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { icon: <Code size={24} />, title: '1. Submit', desc: 'Paste your GitHub repository URL.' },
            { icon: <ShieldCheck size={24} />, title: '2. Verify', desc: 'Our AI analyzes commit history and code complexity.' },
            { icon: <Trophy size={24} />, title: '3. Rank', desc: 'Get a verified percentile score in your key competency.' },
            { icon: <Share2 size={24} />, title: '4. Share', desc: 'Share your verified skill card with recruiters.' }
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center p-8 rounded-[12px] bg-white border border-primary/10 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group">
              <div className="w-16 h-16 rounded-[12px] bg-offwhite flex items-center justify-center text-primary mb-6 border border-primary/5 group-hover:bg-primary group-hover:text-white transition-colors">
                {step.icon}
              </div>
              <h3 className="font-serif font-bold text-xl text-dark mb-2">{step.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
