"use client";

import { useEffect, useRef } from "react";

export type MenuItem = { label: string; onSelect: () => void; danger?: boolean };

type ContextMenuProps = {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
};

const WIDTH = 200;

/** Menu flutuante (clique direito ou botão ⋯). Fecha ao clicar fora ou com Esc. */
export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  // Mantém o menu dentro da tela
  const left = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : x + WIDTH) - WIDTH - 8);
  const top = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : y) - items.length * 34 - 16);

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 rounded-lg border border-line bg-panel py-1 shadow-lg"
      style={{ left: Math.max(8, left), top: Math.max(8, top), width: WIDTH }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          role="menuitem"
          onClick={() => {
            onClose();
            item.onSelect();
          }}
          className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-hover ${
            item.danger ? "text-red-600" : "text-ink"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
