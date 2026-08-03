import { motion } from 'motion/react';
import { ShieldCheck, Trophy, ExternalLink, AlertTriangle, Code2 } from 'lucide-react';

interface VerifiedSkillCardProps {
  score: {
    competency: string;
    percentileScore: number;
    authenticityScore: number;
    summaryText: string;
    createdAt: string;
  };
  submission: {
    title: string;
    repoUrl: string;
  };
  delay?: number;
}

export function VerifiedSkillCard({ score, submission, delay = 0 }: VerifiedSkillCardProps) {
  const isAuthentic = score.authenticityScore >= 70;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={`bg-white/80 backdrop-blur-xl rounded-[16px] border shadow-[0_8px_32px_rgba(2,195,154,0.15)] p-6 relative overflow-hidden flex flex-col h-full ${isAuthentic ? 'border-accent/50' : 'border-orange-300/50'}`}
    >
      <div className={`absolute top-0 right-0 px-4 py-1.5 font-bold text-[10px] rounded-bl-xl uppercase tracking-widest backdrop-blur-sm ${isAuthentic ? 'bg-accent/80 text-dark' : 'bg-orange-100/80 text-orange-800'}`}>
        AI Confidence: {score.authenticityScore}%
      </div>
      
      <div className="flex gap-6 mb-4 mt-2">
        <div className="flex-shrink-0">
          <div className="w-20 h-20 bg-white/50 shadow-inner rounded-[16px] flex items-center justify-center border border-accent/20">
            <Code2 className="w-10 h-10 text-primary" />
          </div>
          <div className="mt-3 text-center">
            <p className="text-[10px] text-muted font-bold uppercase">Percentile</p>
            <p className="text-3xl font-serif font-black text-primary leading-none">{score.percentileScore}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <h3 className="text-xl font-serif font-bold text-dark mb-1 leading-tight">{score.competency}</h3>
          <p className="text-xs text-muted mb-4 line-clamp-3 leading-relaxed flex-grow">{score.summaryText}</p>
          
          <div className="grid grid-cols-2 gap-2 mt-auto">
             <div className="bg-white/60 backdrop-blur-sm p-2 rounded-[10px] border border-primary/10 shadow-sm">
                <p className="text-[9px] text-muted uppercase font-bold tracking-wider">Authenticity</p>
                <p className={`text-xs font-bold ${isAuthentic ? 'text-secondary' : 'text-orange-600'}`}>
                  {isAuthentic ? 'Verified' : 'Needs Review'}
                </p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-2 rounded-[10px] border border-primary/10 truncate shadow-sm">
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
