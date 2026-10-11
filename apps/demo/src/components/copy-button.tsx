"use client";

import { useState } from "react";

export function CopyButton({ value, label, copied }: { value: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard.writeText(value).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
      className="h-7 shrink-0 rounded-md border border-line bg-surface px-2.5 text-xs text-ink transition hover:border-ink"
    >
      {done ? copied : label}
    </button>
  );
}
