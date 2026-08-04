import { useEffect, useState } from 'react';
import { useApi } from '../context/ApiContext';
import { Trophy, Medal, Star, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

export function Leaderboard() {
  const { fetchApi } = useApi();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');

  const categories = ['All', 'React', 'Node.js', 'Python', 'Machine Learning', 'UI/UX Design', 'Database Design', 'Cloud Architecture'];

  useEffect(() => {
    loadLeaderboard(category);
  }, [category]);

  const loadLeaderboard = async (cat: string) => {
    setLoading(true);
    try {
      const res = await fetchApi(`/api/leaderboard?category=${encodeURIComponent(cat)}`);
      setLeaderboard(res.leaderboard || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 relative z-10 w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="font-serif text-4xl font-bold text-dark mb-2">Global Rankings</h1>
        <p className="text-muted text-lg">Top verified student talents across the platform.</p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
              category === c 
                ? 'bg-primary text-white scale-105' 
                : 'bg-white/80 text-muted border border-primary/20 hover:border-primary/50 hover:text-primary'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="bg-white/60 backdrop-blur-xl rounded-[20px] border border-white/50 shadow-xl overflow-hidden flex flex-col min-h-[400px]">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex gap-1">
              <span className="w-3 h-3 rounded-full bg-primary animate-bounce"></span>
              <span className="w-3 h-3 rounded-full bg-primary animate-bounce delay-100"></span>
              <span className="w-3 h-3 rounded-full bg-primary animate-bounce delay-200"></span>
            </div>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <Trophy size={48} className="text-primary/20 mb-4" />
            <h3 className="text-xl font-bold text-dark mb-2">No rankings found</h3>
            <p className="text-muted">No verified skills matching this category yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-primary/10">
            {leaderboard.map((student, index) => (
              <motion.div 
                key={student.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="flex items-center gap-4 p-4 hover:bg-white/80 transition-colors"
              >
                <div className="w-12 h-12 flex items-center justify-center font-serif text-2xl font-bold">
                  {index === 0 ? (
                    <Trophy className="text-yellow-500" size={32} />
                  ) : index === 1 ? (
                    <Medal className="text-gray-400" size={28} />
                  ) : index === 2 ? (
                    <Medal className="text-amber-700" size={28} />
                  ) : (
                    <span className="text-muted/50">#{index + 1}</span>
                  )}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-bold text-dark text-lg">{student.fullName}</h4>
                  <p className="text-xs text-muted font-medium">{student.collegeName}</p>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Star className="text-accent fill-accent" size={16} />
                    <span className="font-black text-xl text-primary">{student.percentileScore}</span>
                  </div>
                  <p className="text-[10px] uppercase font-bold text-muted tracking-wider">{student.topSkill}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
