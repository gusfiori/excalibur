"use client";

import { useRef, useState } from "react";

type RenameInputProps = {
  initial: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
  className?: string;
};

/** Campo de renomear: Enter ou clicar fora salva, Esc cancela. */
export default function RenameInput({ initial, onCommit, onCancel, className }: RenameInputProps) {
  const [value, setValue] = useState(initial);
  const finished = useRef(false);

  const finish = (commit: boolean) => {
    if (finished.current) return;
    finished.current = true;
    const name = value.trim();
    if (commit && name && name !== initial) onCommit(name);
    else onCancel();
  };

  return (
    <input
      autoFocus
      value={value}
      maxLength={200}
      draggable={false}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") finish(true);
        if (e.key === "Escape") finish(false);
      }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={
        className ??
        "min-w-0 flex-1 rounded border border-accent bg-panel px-1 py-0 text-sm text-ink outline-none ring-2 ring-accent-soft"
      }
    />
  );
}
