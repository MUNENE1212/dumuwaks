import React from 'react';
import { Moon } from 'lucide-react';

/**
 * ThemeToggle Component
 *
 * Since this is a dark-only design system with the Rich Dark Theme,
 * this component is now a visual indicator of the dark theme mode.
 * It no longer toggles between light and dark modes.
 *
 * The design system uses:
 * - Deep Mahogany (#14110c) as primary background
 * - Iron Charcoal (#1d1811) as secondary background
 * - Circuit Blue (#e8a317) as primary accent
 * - Wrench Purple (#1fa3d6) as secondary accent
 */
const ThemeToggle: React.FC = () => {
  return (
    <button
      className="p-2 rounded-lg bg-charcoal border border-line hover:bg-surface-300 transition-colors duration-200"
      aria-label="Dark theme enabled"
      title="Dark theme (always on)"
    >
      <Moon className="w-5 h-5 text-lumen-ink" />
    </button>
  );
};

export default ThemeToggle;
