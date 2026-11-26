"use client";

import { createContext, useContext, useState } from "react";
import { DEFAULT_THEME, type ThemeId } from "@/lib/themes";

type LandingTheme = { theme: ThemeId; setTheme: (theme: ThemeId) => void };

const LandingThemeContext = createContext<LandingTheme>({ theme: DEFAULT_THEME, setTheme: () => {} });

/** Tema da página inicial: a seção "Do seu jeito" troca o visual da página inteira. */
export const useLandingTheme = () => useContext(LandingThemeContext);

export default function LandingShell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  return (
    <LandingThemeContext.Provider value={{ theme, setTheme }}>
      <div data-theme={theme} className="landing min-h-screen bg-app text-ink transition-colors duration-500">
        {children}
      </div>
    </LandingThemeContext.Provider>
  );
}
