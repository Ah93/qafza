import Link from "next/link";

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="قفزة">
      <span className={`text-2xl font-bold text-indigo-deep ${compact ? "hidden sm:inline" : ""}`}>قفزة</span>
      <span className="grid size-9 place-items-center rounded-xl bg-brand shadow-md shadow-violet/30">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path
            d="M4 18c0-6 3-10 8-10s8 4 8 10"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="19.5" cy="6" r="1.9" fill="#fad66b" />
        </svg>
      </span>
    </Link>
  );
}
