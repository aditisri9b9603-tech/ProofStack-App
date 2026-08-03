import { useEffect, useState } from 'react';
import { useApi } from '../context/ApiContext';
import { Users, TrendingUp, Plus, Building2, SlidersHorizontal } from 'lucide-react';
import { VerifiedSkillCard } from '../components/VerifiedSkillCard';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';

export function RecruiterDashboard({ profile }: { profile: any }) {
  const { fetchApi } = useApi();
  const [data, setData] = useState<{ students: any[], submissions: any[], scores: any[] } | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [minPercentile, setMinPercentile] = useState<number>(0);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetchApi('/api/recruiter/dashboard');
        setData(res);
      } catch (error) {
        console.error(error);
      }
    };
    loadData();
  }, [fetchApi]);

  if (!data) return <div className="flex-1 flex items-center justify-center">Loading dashboard...</div>;

  const uniqueSkills = Array.from(new Set(data.scores.map(s => s.competency)));

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const filteredScores = data.scores.filter(s => {
    const matchSkill = selectedSkills.length === 0 || selectedSkills.includes(s.competency);
    const matchPercentile = (s.percentileScore || 0) >= minPercentile;
    return matchSkill && matchPercentile;
  });
  
  const averagePercentile = data.scores.length > 0 
    ? Math.round(data.scores.reduce((acc, s) => acc + (s.percentileScore || 0), 0) / data.scores.length)
    : 0;

  return (
    <div className="flex-1 p-4 sm:p-8 relative">
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Recruiter Header / Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-gradient-to-br from-dark/90 to-dark/70 backdrop-blur-xl border border-white/10 text-white p-6 md:p-8 rounded-[16px] shadow-2xl relative overflow-hidden flex flex-col justify-center">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded bg-accent/20 flex items-center justify-center text-accent backdrop-blur-md">
                   <Building2 size={16} />
                </div>
                <div className="text-xs font-bold text-accent uppercase tracking-widest">Recruiter Portal • {profile.collegeName}</div>
              </div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">Discover Verified Talent</h1>
              <p className="text-white/70 max-w-lg text-sm leading-relaxed">
                Browse cryptographically verified skill portfolios. Stop guessing from resumes and start hiring based on proven code capabilities and AI-audited projects.
              </p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
              <Users size={250} />
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl rounded-[16px] p-6 border border-white/50 shadow-xl flex flex-col justify-center">
            <div className="flex items-center gap-3 text-muted mb-6 font-bold text-xs uppercase tracking-wider">
              <TrendingUp className="text-primary" size={16} /> Network Stats
            </div>
            <div className="flex items-end gap-6">
              <div>
                <div className="text-4xl font-serif font-bold text-dark">{data.students.length}</div>
                <div className="text-xs text-muted font-medium mt-1">Verified Students</div>
              </div>
              <div className="w-px h-12 bg-primary/20"></div>
              <div>
                <div className="text-4xl font-serif font-bold text-primary">{averagePercentile}</div>
                <div className="text-xs text-muted font-medium mt-1">Avg Percentile</div>
              </div>
            </div>
          </div>
        </div>

        {/* Talent Pool Section */}
        <div className="flex flex-col justify-between items-start gap-6 bg-white/60 backdrop-blur-xl p-6 rounded-[16px] shadow-xl border border-white/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            <h2 className="text-xl font-serif font-bold text-dark px-2">Verified Submissions</h2>
            <button
              onClick={() => setIsChallengeModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-5 py-2.5 rounded-[8px] font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all whitespace-nowrap"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Post Challenge</span>
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 w-full px-2">
            {/* Percentile Filter */}
            <div className="flex flex-col min-w-[200px]">
              <label className="text-sm text-dark font-bold flex items-center gap-2 mb-3">
                <SlidersHorizontal size={14} className="text-primary" /> Minimum Percentile: {minPercentile}%
              </label>
              <input 
                type="range" 
                min="0" 
                max="99" 
                value={minPercentile} 
                onChange={(e) => setMinPercentile(Number(e.target.value))}
                className="w-full h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted mt-2 font-medium">
                <span>0%</span>
                <span>Top 1%</span>
              </div>
            </div>

            {/* Skill Filter */}
            {uniqueSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 flex-1 items-start">
                <span className="text-sm text-dark font-bold self-center mr-2 w-full mb-1">Filter by Skills:</span>
                {uniqueSkills.map(skill => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm ${
                      selectedSkills.includes(skill)
                        ? 'bg-primary text-white border-primary scale-105 shadow-md'
                        : 'bg-white/80 text-muted border-primary/20 hover:border-primary/50 hover:text-dark'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
                {selectedSkills.length > 0 && (
                  <button
                    onClick={() => setSelectedSkills([])}
                    className="px-3 py-1.5 rounded-full text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {filteredScores.length === 0 ? (
          <div className="bg-white/50 backdrop-blur-sm p-12 rounded-[16px] border-2 border-dashed border-primary/20 text-center shadow-inner">
            <p className="text-muted font-medium">No submissions match your criteria.</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredScores.map((score) => {
                const submission = data.submissions.find(s => s.id === score.submissionId);
                const student = data.students.find(s => s.userId === submission?.studentId);
                if (!submission || !student) return null;
                
                return (
                  <motion.div 
                    key={score.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col hover:-translate-y-1 transition-transform"
                  >
                    <div className="bg-white/80 backdrop-blur-md px-5 py-3 border-x border-t border-primary/10 rounded-t-[16px] flex items-center justify-between text-sm shadow-sm relative z-10">
                      <span className="font-bold text-dark truncate">{student.fullName}</span>
                      <span className="text-muted text-[10px] uppercase font-bold tracking-wider truncate max-w-[120px]">{student.collegeName}</span>
                    </div>
                    <div className="flex-grow -mt-2">
                      <VerifiedSkillCard score={score} submission={submission} />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

      </div>
      
      {/* Simple Challenge Modal */}
      {isChallengeModalOpen && (
        <PostChallengeModal onClose={() => setIsChallengeModalOpen(false)} fetchApi={fetchApi} />
      )}
    </div>
  );
}

function PostChallengeModal({ onClose, fetchApi }: { onClose: () => void, fetchApi: any }) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillTag, setSkillTag] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi('/api/challenges', {
        method: 'POST',
        body: JSON.stringify({ title, description, skillTag })
      });
      showToast('Challenge posted successfully!', 'success');
      onClose();
    } catch (e) {
      showToast('Failed to post challenge', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/40 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white/90 backdrop-blur-2xl rounded-[16px] p-6 w-full max-w-md shadow-2xl border border-white/50"
      >
        <h2 className="text-xl font-serif font-bold text-dark mb-4">Post a Challenge</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="Challenge Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 rounded-[10px] border border-primary/20 bg-white/50 text-sm focus:outline-none focus:border-primary shadow-inner" />
          <textarea required placeholder="Description (what should they build?)" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 rounded-[10px] border border-primary/20 bg-white/50 text-sm min-h-[100px] focus:outline-none focus:border-primary shadow-inner" />
          <input required placeholder="Skill Tag (e.g. React, Python)" value={skillTag} onChange={e => setSkillTag(e.target.value)} className="w-full p-3 rounded-[10px] border border-primary/20 bg-white/50 text-sm focus:outline-none focus:border-primary shadow-inner" />
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted font-bold hover:text-dark">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-[8px] text-sm font-bold shadow-lg hover:shadow-xl disabled:opacity-50 transition-all">{saving ? 'Posting...' : 'Post Challenge'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

