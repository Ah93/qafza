import { Lock, Star } from "lucide-react";

const OCTAGON = "polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)";

export function BadgeShape({ color, locked, size = 48 }: { color: string; locked?: boolean; size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center"
      style={{ width: size, height: size, clipPath: OCTAGON, background: locked ? "rgba(123,38,204,.10)" : color }}
    >
      {locked ? (
        <Lock className="text-violet/75" style={{ width: size * 0.38, height: size * 0.38 }} />
      ) : (
        <Star className="fill-white text-white" style={{ width: size * 0.42, height: size * 0.42 }} />
      )}
    </span>
  );
}
