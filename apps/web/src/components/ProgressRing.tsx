import { kolorPostepu } from "@sep/shared";

const TOKEN_COLOR: Record<ReturnType<typeof kolorPostepu>, string> = {
  danger: "#fb7185",
  warning: "#fbbf24",
  ok: "#c33a5e",
  success: "#34d399",
};

interface Props {
  pct: number;
  label?: string;
  size?: number;
}

/** Pierścień postępu z gamifikacją (kolor od czerwonego do zielonego) — mockup mobile/dashboard. */
export function ProgressRing({ pct, label, size = 96 }: Props) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(pct, 100));
  const dash = (clamped / 100) * c;
  const color = TOKEN_COLOR[kolorPostepu(pct)];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2c2528" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-semibold" style={{ color }}>
            {Math.round(pct)}%
          </span>
        </div>
      </div>
      {label && <span className="text-xs uppercase tracking-wide text-ink-muted">{label}</span>}
    </div>
  );
}
