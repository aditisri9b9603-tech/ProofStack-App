import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../context/ApiContext';
import { VerifiedSkillCard } from '../components/VerifiedSkillCard';
import { SubmitProjectModal } from '../components/SubmitProjectModal';
import { Plus, GraduationCap, Building2, Trophy, ArrowRight, Code2, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export function StudentDashboard({ profile }: { profile: any }) {
  const { fetchApi } = useApi();
  const { showToast } = useToast();
  const [data, setData] = useState<{ submissions: any[], scores: any[], challenges: any[] } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const loadDashboard = async () => {
    try {
      const res = await fetchApi('/api/student/dashboard');
      setData(res);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleNewSubmission = (newResult: any) => {
    if (data) {
      setData({
        ...data,
        submissions: [newResult.submission, ...data.submissions],
        scores: [newResult.score, ...data.scores]
      });

      if (newResult.score && newResult.score.percentileScore >= 80) {
        showToast(`Skill Level-Up! You hit the ${newResult.score.percentileScore}th percentile in ${newResult.score.competency}!`, 'success');
      } else {
        showToast('Project verified successfully!', 'success');
      }
    }
  };

  const handleAcceptChallenge = (challengeId: string) => {
    showToast('Challenge accepted! Check your email for next steps.', 'success');
  };

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading your dashboard...</div>;
  }

  const avgScore = data.scores.length > 0 
    ? Math.round(data.scores.reduce((acc, s) => acc + s.percentileScore, 0) / data.scores.length)
    : 0;
    
  const dashOffset = 364 - (364 * (avgScore / 100));

  return (
    <div className="flex-1 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Profile & Stats */}
        <div className="col-span-1 lg:col-span-3 flex flex-col gap-6 relative z-10">
          <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[16px] shadow-xl border border-white/50">
            <h2 className="font-serif text-lg font-bold mb-4">Verified Standing</h2>
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="64" cy="64" r="58" fill="none" stroke="#F4FAF9" strokeWidth="8" />
                  <circle cx="64" cy="64" r="58" fill="none" stroke="#028090" strokeWidth="8" strokeDasharray="364" strokeDashoffset={avgScore === 0 ? 364 : dashOffset} className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-primary">{avgScore > 0 ? avgScore : '--'}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted font-bold mt-0.5">Overall Rank</span>
                </div>
              </div>
              <p className="text-sm text-center text-muted px-2 italic">
                {avgScore > 0 
                  ? `"Top ${100 - avgScore}% of contributors across verified skills."`
                  : `"Submit your first project to get verified."`}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-dark/90 to-dark/70 backdrop-blur-xl border border-white/10 text-white p-6 rounded-[16px] shadow-2xl flex-1">
            <h2 className="font-serif text-lg font-bold mb-4 text-accent">Career Pathways</h2>
            <ul className="space-y-4">
              <li className="border-l-2 border-accent pl-4">
                <p className="text-xs text-accent uppercase font-bold">Top Match</p>
                <p className="text-sm font-medium">Software Engineer</p>
              </li>
              <li className="border-l-2 border-white/20 pl-4">
                <p className="text-xs text-white/50 uppercase font-bold">Secondary</p>
                <p className="text-sm font-medium">Full-Stack Developer</p>
              </li>
            </ul>
            <button onClick={() => setIsPreviewModalOpen(true)} className="w-full mt-6 py-2 bg-gradient-to-r from-primary to-primary-dark text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              View Recruiter Profile
            </button>
          </div>
        </div>

        {/* Right Column: Verification Center */}
        <div className="col-span-1 lg:col-span-9 flex flex-col gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-bold text-dark mb-1">Verification Center</h1>
              <p className="text-muted">AI-audited portfolios and real-world skill telemetry.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPreviewModalOpen(true)}
                className="flex items-center gap-2 bg-white text-dark border border-primary/20 px-6 py-2.5 rounded-[12px] font-bold shadow-sm hover:bg-offwhite transition-all"
              >
                View Profile
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-2.5 rounded-[12px] font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                <span className="text-lg leading-none mb-0.5">+</span> Submit New Project
              </button>
            </div>
          </div>

          {data.submissions.length === 0 ? (
            <div className="bg-white/50 backdrop-blur-sm rounded-[16px] border-2 border-dashed border-primary/20 p-12 text-center flex flex-col items-center shadow-inner">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Trophy size={32} />
              </div>
              <h3 className="text-xl font-bold text-dark mb-2">No verified skills yet</h3>
              <p className="text-muted text-sm max-w-md mb-6 font-medium">Connect your first GitHub repository to get it analyzed and ranked by our AI. Build your portfolio to stand out.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:bg-dark transition-colors hover:-translate-y-1"
              >
                Start First Verification
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.submissions.map((sub, i) => {
                const score = data.scores.find(s => s.submissionId === sub.id);
                if (!score) return null;
                return <VerifiedSkillCard key={sub.id} score={score} submission={sub} delay={i * 0.1} />;
              })}
            </div>
          )}

          {/* Secondary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 mt-2">
            <div className="bg-white/60 backdrop-blur-xl rounded-[16px] p-6 border border-white/50 shadow-xl flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-serif font-bold text-lg">Open Challenges</h3>
                <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded font-bold uppercase backdrop-blur-sm">{data.challenges.length} Available</span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-48 pr-2">
                {data.challenges.length === 0 && <p className="text-sm text-muted italic">No open challenges right now.</p>}
                {data.challenges.map(challenge => (
                  <div key={challenge.id} onClick={() => handleAcceptChallenge(challenge.id)} className="p-3 bg-white/70 backdrop-blur-md rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between group cursor-pointer hover:bg-primary/10 hover:shadow-sm transition-all gap-2">
                    <div>
                      <p className="text-sm font-bold text-dark">{challenge.title}</p>
                      <p className="text-[10px] text-muted font-medium">Tag: {challenge.skillTag}</p>
                    </div>
                    <ArrowRight size={16} className="text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-xl rounded-[16px] p-6 border border-white/50 shadow-xl flex flex-col">
              <h3 className="font-serif font-bold text-lg mb-4">Verified Repositories</h3>
              <div className="space-y-4 flex-1 overflow-y-auto max-h-48 pr-2">
                {data.submissions.length === 0 && <p className="text-sm text-muted italic">No repositories analyzed yet.</p>}
                {data.submissions.map(sub => {
                  const score = data.scores.find(s => s.submissionId === sub.id);
                  if (!score) return null;
                  return (
                    <div key={sub.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/80 backdrop-blur-md shadow-sm rounded-lg flex items-center justify-center text-primary border border-primary/10">
                        <Code2 size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <p className="text-sm font-bold text-dark truncate max-w-[150px]">{sub.title}</p>
                          <p className="text-xs font-bold text-primary">{score.percentileScore}th</p>
                        </div>
                        <div className="w-full bg-white/50 shadow-inner h-1.5 rounded-full mt-1 overflow-hidden">
                          <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${score.percentileScore}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <SubmitProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleNewSubmission} />
      {isPreviewModalOpen && (
        <PublicProfileModal profile={profile} data={data} onClose={() => setIsPreviewModalOpen(false)} />
      )}
    </div>
  );
}

function PublicProfileModal({ profile, data, onClose }: { profile: any, data: any, onClose: () => void }) {
  const radarData = useMemo(() => {
    const categoryMap = new Map();
    data.scores.forEach((s: any) => {
      const current = categoryMap.get(s.competency) || 0;
      categoryMap.set(s.competency, Math.max(current, s.percentileScore));
    });
    
    let chartData = Array.from(categoryMap.entries()).map(([subject, A]) => ({ subject, A }));
    
    // Fallback if not enough data for radar chart to render properly
    if (chartData.length < 3) {
       chartData.push({ subject: 'Problem Solving', A: 0 });
       chartData.push({ subject: 'System Design', A: 0 });
       chartData.push({ subject: 'Code Quality', A: 0 });
       // Unique subjects only
       const unique = new Map(chartData.map(item => [item.subject, item]));
       chartData = Array.from(unique.values());
    }
    
    return chartData;
  }, [data.scores]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/40 backdrop-blur-sm">
      <div className="bg-white rounded-[12px] p-6 w-full max-w-3xl shadow-2xl border border-primary/10 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-serif font-bold text-dark">Recruiter View: {profile.fullName}</h2>
          <button onClick={onClose} className="p-2 text-muted hover:bg-offwhite rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-dark text-white p-6 rounded-[12px] flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4 border-2 border-primary">
              <GraduationCap size={40} />
            </div>
            <h3 className="text-xl font-bold">{profile.fullName}</h3>
            <p className="text-accent text-sm uppercase tracking-widest mt-1">{profile.collegeName}</p>
            <div className="mt-6 w-full border-t border-white/10 pt-4">
              <p className="text-xs text-white/50 mb-1">Total Verified Projects</p>
              <p className="text-2xl font-serif font-bold">{data.submissions.length}</p>
            </div>
          </div>
          
          <div className="md:col-span-2 space-y-4">
            <h3 className="font-serif font-bold text-lg text-dark">Skill Breadth</h3>
            <div className="bg-white border border-primary/10 rounded-[12px] p-4 h-64 shadow-inner flex items-center justify-center">
              {data.scores.length === 0 ? (
                 <p className="text-muted text-sm italic">Not enough data to visualize.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name={profile.fullName} dataKey="A" stroke="#028090" fill="#028090" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
            
            <h3 className="font-serif font-bold text-lg text-dark mt-6">Verified Skills</h3>
            {data.scores.length === 0 ? (
              <p className="text-muted text-sm italic">No verified skills available yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.scores.map((score: any) => {
                  const submission = data.submissions.find((s: any) => s.id === score.submissionId);
                  if (!submission) return null;
                  return (
                    <VerifiedSkillCard key={score.id} score={score} submission={submission} />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
