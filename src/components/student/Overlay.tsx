"use client";

export function Overlay({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-indigo-deep/50 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={label}>
      <div className="w-full max-w-[420px] animate-[pop_.3s_ease-out] rounded-[28px] bg-white p-7 text-center shadow-2xl">{children}</div>
    </div>
  );
}
