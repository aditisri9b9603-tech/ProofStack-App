import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Github, Loader2 } from 'lucide-react';
import { useApi } from '../context/ApiContext';
import { useToast } from '../context/ToastContext';

export function SubmitProjectModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: (data: any) => void }) {
  const { fetchApi } = useApi();
  const { showToast } = useToast();
  const [repoUrl, setRepoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'fetching' | 'analyzing' | 'scoring'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('fetching');
    
    try {
      // Simulate stepped UI progression for demo
      setTimeout(() => setStatus('analyzing'), 2000);
      setTimeout(() => setStatus('scoring'), 4500);

      const result = await fetchApi('/api/verify', {
        method: 'POST',
        body: JSON.stringify({ repoUrl, title, description }),
      });
      
      onSuccess(result);
      showToast('Project submitted and verified successfully!', 'success');
      onClose();
      // reset
      setRepoUrl('');
      setTitle('');
      setDescription('');
      setStatus('idle');
    } catch (error) {
      console.error(error);
      showToast('Failed to analyze repository. Check URL and try again.', 'error');
      setStatus('idle');
    }
  };

  const loadingMessages = {
    fetching: "Fetching repository metadata & commit history...",
    analyzing: "Analyzing code complexity & development patterns...",
    scoring: "Generating AI verification score..."
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-[12px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-primary/20"
        >
          <div className="px-6 py-5 border-b border-primary/10 flex justify-between items-center bg-offwhite">
            <h2 className="text-xl font-serif font-bold text-dark flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                <Github className="text-primary" size={18} />
              </div>
              Verify New Skill
            </h2>
            <button onClick={onClose} disabled={status !== 'idle'} className="p-2 text-muted hover:text-dark disabled:opacity-50 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            {status === 'idle' ? (
              <form id="submit-form" onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">GitHub Repository URL</label>
                  <input
                    type="url"
                    required
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/project"
                    className="w-full px-4 py-3 rounded-[8px] border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-offwhite text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Project Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. E-commerce React Dashboard"
                    className="w-full px-4 py-3 rounded-[8px] border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-offwhite text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Your Role / Focus</label>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what you built and the complex challenges you solved..."
                    className="w-full px-4 py-3 rounded-[8px] border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-offwhite text-sm min-h-[100px] resize-y"
                  />
                </div>
              </form>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="text-primary"
                >
                  <Loader2 size={48} />
                </motion.div>
                <div className="space-y-2">
                  <h3 className="text-xl font-serif font-bold text-dark">Analyzing Repository</h3>
                  <p className="text-sm font-bold text-secondary animate-pulse">
                    {loadingMessages[status as keyof typeof loadingMessages]}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-primary/10 bg-offwhite flex justify-end">
            <button
              onClick={onClose}
              disabled={status !== 'idle'}
              className="px-6 py-2.5 text-sm font-bold text-muted hover:text-dark disabled:opacity-50 transition-colors mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="submit-form"
              disabled={status !== 'idle'}
              className="px-6 py-2.5 rounded-[12px] bg-primary text-white text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none transition-all flex items-center gap-2"
            >
              {status !== 'idle' ? 'Processing...' : 'Submit for Verification'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
