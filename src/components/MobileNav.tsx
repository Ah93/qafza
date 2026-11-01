"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/**
 * The section navigation for phones. The header pills only fit from tablet width up, so below that
 * the same destinations live in a bar at the bottom of the screen (where thumbs reach).
 * Pages get room for it through the `[data-mobile-nav]` rule in globals.css.
 */
export function MobileNav({ items, label }: { items: NavItem[]; label: string }) {
  const path = usePathname();
  return (
    <nav
      data-mobile-nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-violet/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-[520px] items-stretch justify-around px-2">
        {items.map(({ href, label: text, icon: Icon }) => {
          const on = path === href || path.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-[10px] font-bold transition ${on ? "text-violet" : "text-indigo-deep/50"}`}
              >
                <span className={`grid h-7 w-12 place-items-center rounded-full transition ${on ? "bg-violet/10" : ""}`}>
                  <Icon className="size-[18px]" strokeWidth={on ? 2.4 : 2} />
                </span>
                {text}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
