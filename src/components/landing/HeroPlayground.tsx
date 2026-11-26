"use client";

import dynamic from "next/dynamic";

// O editor só funciona no navegador
const Playground = dynamic(() => import("@/components/landing/Playground"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-ink-faint">Preparando o quadro…</div>,
});

export default function HeroPlayground() {
  return <Playground />;
}
