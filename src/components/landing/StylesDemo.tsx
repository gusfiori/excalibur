"use client";

import { ThemePicker } from "@/components/ThemePicker";
import { useLandingTheme } from "@/components/landing/LandingShell";

/** Os três estilos: clicar troca o visual da página inteira. */
export default function StylesDemo() {
  const { theme, setTheme } = useLandingTheme();
  return <ThemePicker value={theme} onChange={setTheme} />;
}
