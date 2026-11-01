"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: string) => {
    setMessage(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2600);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const node = (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 max-md:bottom-24 flex justify-center px-5"
    >
      {message && (
        <div className="pointer-events-auto flex animate-[pop_.3s_ease-out] items-center gap-2.5 rounded-full bg-indigo-deep px-5 py-3 text-xs font-bold text-white shadow-2xl shadow-indigo-deep/40">
          <span className="grid size-5 place-items-center rounded-full bg-mint">
            <Check className="size-3" strokeWidth={3.5} />
          </span>
          {message}
        </div>
      )}
    </div>
  );

  return { show, node };
}
