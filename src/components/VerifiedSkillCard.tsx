import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Trophy, ExternalLink, AlertTriangle, Code2, ThumbsUp, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../context/ApiContext';
import { useState, useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface VerifiedSkillCardProps {
  score: {
    competency: string;
    percentileScore: number;
    authenticityScore: number;
    summaryText: string;
    createdAt: string;
  };
  submission: {
    id?: string;
    title: string;
    repoUrl: string;
    endorsements?: string[];
  };
  delay?: number;
}

export function VerifiedSkillCard({ score, submission, delay = 0 }: VerifiedSkillCardProps) {
  const { user } = useAuth();
  const { fetchApi } = useApi();
  const isAuthentic = score.authenticityScore >= 70;
  
  const [endorsements, setEndorsements] = useState<string[]>(submission.endorsements || []);
  const [isEndorsing, setIsEndorsing] = useState(false);
  
  const hasEndorsed = user && endorsements.includes(user.uid);

  const handleEndorse = async () => {
    if (!user || !submission.id || isEndorsing) return;
    setIsEndorsing(true);
    // Optimistic update
    const previous = [...endorsements];
    let newEndorsements;
    if (hasEndorsed) {
      newEndorsements = endorsements.filter(id => id !== user.uid);
    } else {
      newEndorsements = [...endorsements, user.uid];
    }
    setEndorsements(newEndorsements);
    
    try {
      const res = await fetchApi(`/api/submissions/${submission.id}/endorse`, {
        method: 'POST'
      });
      if (res.endorsements) {
        setEndorsements(res.endorsements);
      }
    } catch (e) {
      setEndorsements(previous);
    } finally {
      setIsEndorsing(false);
    }
  };

  // Generate a mock progression array ending at the current score for the sparkline
  const sparklineData = useMemo(() => {
    const data = [];
    let current = Math.max(0, score.percentileScore - 20);
    for (let i = 0; i < 5; i++) {
      data.push({ value: current });
      current = Math.min(100, current + Math.floor(Math.random() * 10));
    }
    data.push({ value: score.percentileScore });
    return data;
  }, [score.percentileScore]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={`group bg-white/60 backdrop-blur-md hover:backdrop-blur-xl hover:bg-white/80 transition-all rounded-[16px] border shadow-[0_8px_32px_rgba(2,195,154,0.15)] hover:shadow-[0_12px_40px_rgba(2,195,154,0.3)] p-6 relative overflow-hidden flex flex-col h-full ${isAuthentic ? 'border-accent/40 hover:border-accent/80' : 'border-orange-300/40 hover:border-orange-400'}`}
    >
      <div className={`absolute top-0 right-0 px-4 py-1.5 font-bold text-[10px] rounded-bl-xl uppercase tracking-widest backdrop-blur-sm ${isAuthentic ? 'bg-accent/80 text-dark' : 'bg-orange-100/80 text-orange-800'}`}>
        AI Confidence: {score.authenticityScore}%
      </div>
      
      <div className="flex gap-6 mb-4 mt-2">
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className="w-20 h-20 bg-white/50 shadow-inner rounded-[16px] flex items-center justify-center border border-accent/20">
            <Code2 className="w-10 h-10 text-primary" />
          </div>
          <div className="mt-3 text-center">
            <p className="text-[10px] text-muted font-bold uppercase">Percentile</p>
            <p className="text-3xl font-serif font-black text-primary leading-none">{score.percentileScore}</p>
          </div>
          
          <div className="w-16 h-8 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
            <motion.div
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{ duration: 1, delay: delay + 0.3, ease: 'easeOut' }}
              className="w-full h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <h3 className="text-xl font-serif font-bold text-dark mb-1 leading-tight">{score.competency}</h3>
              <div className="w-full bg-white/50 shadow-inner h-1.5 rounded-full overflow-hidden mt-1.5 mb-3 border border-primary/5">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${score.percentileScore}%` }}
                   transition={{ duration: 1, delay: delay + 0.2, ease: "easeOut" }}
                   className="bg-primary h-full rounded-full"
                />
              </div>
            </div>
            
            {submission.id && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleEndorse}
                disabled={isEndorsing}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all shadow-sm overflow-hidden ${
                  hasEndorsed 
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-transparent shadow-[0_4px_12px_rgba(244,63,94,0.3)]' 
                    : 'bg-white/80 text-muted border-primary/20 hover:border-rose-400 hover:text-rose-500'
                }`}
              >
                <AnimatePresence>
                  {hasEndorsed && (
                    <motion.div
                      initial={{ scale: 0, opacity: 1, y: 0 }}
                      animate={{ scale: 2, opacity: 0, y: -20 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <Heart size={16} className="fill-white text-white opacity-50" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.div animate={hasEndorsed ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.3 }}>
                  <Heart size={14} className={hasEndorsed ? 'fill-current text-white' : 'text-current'} />
                </motion.div>
                <span>{endorsements.length}</span>
              </motion.button>
            )}
          </div>
          
          <p className="text-xs text-muted mb-4 line-clamp-3 leading-relaxed flex-grow">{score.summaryText}</p>
          
          <div className="grid grid-cols-2 gap-2 mt-auto">
             <div className="bg-white/60 backdrop-blur-sm p-2 rounded-[10px] border border-primary/10 shadow-sm transition-all group-hover:shadow-md">
                <p className="text-[9px] text-muted uppercase font-bold tracking-wider">Authenticity</p>
                <p className={`text-xs font-bold ${isAuthentic ? 'text-secondary' : 'text-orange-600'}`}>
                  {isAuthentic ? 'Verified' : 'Needs Review'}
                </p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-2 rounded-[10px] border border-primary/10 truncate shadow-sm transition-all group-hover:shadow-md">
                <p className="text-[9px] text-muted uppercase font-bold tracking-wider">Project</p>
                <a 
                  href={submission.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-primary hover:underline truncate block"
                >
                  {submission.title}
                </a>
              </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
