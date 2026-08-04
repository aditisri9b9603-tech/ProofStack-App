import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemePreset = 'ocean' | 'forest' | 'sunset';

interface ThemeContextType {
  theme: ThemePreset;
  setTheme: (theme: ThemePreset) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themes: Record<ThemePreset, Record<string, string>> = {
  ocean: {
    '--color-primary': '#028090',
    '--color-secondary': '#00A896',
    '--color-accent': '#02C39A',
    '--color-dark': '#042A2B',
    '--color-offwhite': '#F4FAF9',
    '--color-ink': '#0B2B2C',
    '--color-muted': '#5B7A78'
  },
  forest: {
    '--color-primary': '#2D6A4F',
    '--color-secondary': '#40916C',
    '--color-accent': '#52B788',
    '--color-dark': '#081C15',
    '--color-offwhite': '#F1F8F5',
    '--color-ink': '#1B4332',
    '--color-muted': '#74A58E'
  },
  sunset: {
    '--color-primary': '#E07A5F',
    '--color-secondary': '#F4A261',
    '--color-accent': '#E9C46A',
    '--color-dark': '#3D405B',
    '--color-offwhite': '#FDFBF7',
    '--color-ink': '#2B2D42',
    '--color-muted': '#8D99AE'
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreset>('ocean');

  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = themes[theme];
    for (const [key, value] of Object.entries(currentTheme)) {
      root.style.setProperty(key, value);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
