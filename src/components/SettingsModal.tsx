import { motion, AnimatePresence } from 'motion/react';
import { X, Palette, Loader2 } from 'lucide-react';
import { useTheme, ThemePreset } from '../context/ThemeContext';
import { useState } from 'react';
import { useApi } from '../context/ApiContext';
import { useToast } from '../context/ToastContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { fetchApi } = useApi();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleThemeChange = async (newTheme: ThemePreset) => {
    setTheme(newTheme);
    setSaving(true);
    try {
      await fetchApi('/api/profile/theme', {
        method: 'POST',
        body: JSON.stringify({ theme: newTheme })
      });
      showToast('Theme updated successfully', 'success');
    } catch (e) {
      showToast('Failed to save theme', 'error');
    } finally {
      setSaving(false);
    }
  };

  const presets: { id: ThemePreset, name: string, colors: string[] }[] = [
    { id: 'ocean', name: 'Ocean', colors: ['#028090', '#00A896', '#02C39A'] },
    { id: 'forest', name: 'Forest', colors: ['#2D6A4F', '#40916C', '#52B788'] },
    { id: 'sunset', name: 'Sunset', colors: ['#E07A5F', '#F4A261', '#E9C46A'] },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark/40 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white/90 backdrop-blur-2xl rounded-[16px] p-6 w-full max-w-md shadow-2xl border border-white/50"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif font-bold text-dark flex items-center gap-2">
                <Palette size={20} className="text-primary" /> Settings
              </h2>
              <button onClick={onClose} className="p-2 text-muted hover:bg-black/5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-dark mb-3">Accent Theme</h3>
                <div className="grid grid-cols-1 gap-3">
                  {presets.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => handleThemeChange(preset.id)}
                      className={`flex items-center justify-between p-3 rounded-[12px] border transition-all ${
                        theme === preset.id
                          ? 'border-primary bg-primary/5 shadow-inner'
                          : 'border-black/10 hover:border-primary/50 bg-white/50 hover:bg-white/80'
                      }`}
                    >
                      <span className="font-bold text-sm text-dark">{preset.name}</span>
                      <div className="flex -space-x-2">
                        {preset.colors.map((c, i) => (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {saving && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-primary font-bold">
                <Loader2 size={14} className="animate-spin" /> Saving...
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
