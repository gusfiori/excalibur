"use client";

import { useEffect, useRef, useState } from "react";

/** Aparece suavemente (e "desenha" as setas dentro) quando entra na tela. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-visible={visible || undefined} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Anotação "escrita à mão" com uma seta curva que se desenha. */
export function Note({
  children,
  direction = "down-left",
  className = "",
}: {
  children: React.ReactNode;
  direction?: "down-left" | "down-right" | "right" | "left";
  className?: string;
}) {
  // [curva, ponta da seta]
  const paths: Record<string, [string, string]> = {
    "down-left": ["M70 6 C 60 30, 40 44, 12 52", "M24 40 L12 52 L28 56"],
    "down-right": ["M10 6 C 20 30, 40 44, 68 52", "M56 40 L68 52 L52 56"],
    right: ["M6 30 C 26 10, 50 10, 72 26", "M58 24 L72 26 L68 13"],
    left: ["M74 30 C 54 10, 30 10, 8 26", "M22 24 L8 26 L12 13"],
  };
  return (
    <span className={`inline-flex items-end gap-1 font-hand text-2xl leading-none text-accent ${className}`}>
      {direction === "left" && <Arrow parts={paths.left} />}
      <span>{children}</span>
      {direction !== "left" && <Arrow parts={paths[direction]} />}
    </span>
  );
}

function Arrow({ parts: [curve, head] }: { parts: [string, string] }) {
  const stroke = { stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width="80" height="60" viewBox="0 0 80 60" fill="none" aria-hidden="true" className="shrink-0">
      <path d={curve} pathLength={1} className="draw-path" {...stroke} />
      {/* a ponta só aparece depois da curva */}
      <path d={head} pathLength={1} className="draw-path" style={{ transitionDelay: "1.2s" }} {...stroke} />
    </svg>
  );
}
