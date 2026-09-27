import React, { createContext, useContext, ReactNode } from 'react';

type Theme = 'dark'; // Dark-only theme now

interface ThemeContextType {
  theme: Theme;
  isDarkOnly: boolean; // Indicates this is a dark-only design system
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider — Dumuwaks is night-only (Emen order: light is seen against dark).
 * Tokens: src/styles/tokens.css. Design notes: docs/design/DESIGN_SYSTEM.md.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Always use dark theme
  const theme: Theme = 'dark';
  const isDarkOnly = true;

  // Set dark class on document root
  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
    // Set color scheme to dark
    root.style.colorScheme = 'dark';
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDarkOnly }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
