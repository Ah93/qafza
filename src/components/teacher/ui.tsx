"use client";

import { useId } from "react";

export const fieldCls =
  "w-full rounded-2xl border border-violet/10 bg-white px-4 py-3.5 text-sm text-indigo-deep outline-none transition placeholder:text-indigo-deep/65 focus:border-violet focus:ring-4 focus:ring-violet/10";

export function Chip({
  on,
  onClick,
  children,
  disabled,
  circle,
}: {
  on: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  circle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={`border text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${
        circle ? "grid size-10 place-items-center rounded-full" : "rounded-full px-5 py-2.5"
      } ${
        on
          ? "border-violet bg-violet/10 text-violet"
          : "border-violet/15 bg-white text-indigo-deep hover:border-violet/40"
      }`}
    >
      {children}
    </button>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const id = useId();
  return (
    <span className="relative inline-flex shrink-0 items-center">
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        aria-hidden
        className="relative block h-7 w-12 cursor-pointer rounded-full bg-violet/15 transition peer-checked:bg-violet peer-focus-visible:ring-4 peer-focus-visible:ring-violet/20 after:absolute after:start-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:after:start-6"
      />
    </span>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-bold text-violet">
      <span className="size-2 rounded-full bg-violet" />
      {children}
    </p>
  );
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-xs font-bold text-indigo-deep">
      {children}
    </label>
  );
}
