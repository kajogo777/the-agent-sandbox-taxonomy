import type { LayerKey } from "../types";

// Strength score → color scheme
const STRENGTH_STYLES: Record<
  number | -1,
  { bg: string; border: string; text: string }
> = {
  [-1]: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-400",
  },
  0: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-600",
  },
  1: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
  },
  2: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  3: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
  },
  4: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
};

export function ScoreCell({
  s,
  g,
  layer,
  onClick,
}: {
  s: number | null;
  g: number | null;
  layer?: LayerKey;
  onClick?: () => void;
}) {
  const key = s === null || s === undefined ? -1 : s;
  const style = STRENGTH_STYLES[key] ?? STRENGTH_STYLES[-1];
  const label =
    s === null || s === undefined
      ? "—"
      : g !== null && g !== undefined
        ? `${s}.${g}`
        : String(s);

  return (
    <button
      onClick={onClick}
      title={
        layer
          ? `${layer}: S=${s ?? "—"} G=${g ?? "—"}`
          : `S=${s ?? "—"} G=${g ?? "—"}`
      }
      className={`w-full px-1 py-1.5 text-xs font-semibold rounded border text-center transition-all hover:scale-105 ${style.bg} ${style.border} ${style.text}`}
    >
      {label}
    </button>
  );
}

// Strength bar for visual comparison
export function StrengthBar({ s }: { s: number | null }) {
  if (s === null || s === undefined || s === 0) return null;
  const pct = (s / 4) * 100;
  const colors: Record<number, string> = {
    1: "bg-amber-300",
    2: "bg-blue-400",
    3: "bg-violet-400",
    4: "bg-emerald-400",
  };
  return (
    <div className="w-full h-1 bg-gray-100 rounded-full mt-0.5">
      <div
        className={`h-full rounded-full ${colors[s] ?? "bg-gray-300"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// Evidence badge
export function EvidenceBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    verified: "text-emerald-700 bg-emerald-50",
    "source-code": "text-blue-700 bg-blue-50",
    docs: "text-amber-700 bg-amber-50",
    inferred: "text-red-700 bg-red-50",
  };
  return (
    <span
      className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${styles[level] ?? "text-gray-500 bg-gray-100"}`}
    >
      {level}
    </span>
  );
}

// Threat indicator
export function ThreatIndicator({
  level,
  size = "sm",
}: {
  level: "full" | "partial" | "none";
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "w-5 h-5" : "w-4 h-4";
  if (level === "full") {
    return (
      <span
        className={`inline-block ${dim} rounded-full bg-emerald-500`}
        title="Addressed"
      />
    );
  }
  if (level === "partial") {
    return (
      <span
        className={`inline-flex items-center justify-center ${dim}`}
        title="Partial"
      >
        <svg viewBox="0 0 20 20" className={dim}>
          <circle cx="10" cy="10" r="9" fill="#f3f4f6" stroke="#d97706" strokeWidth="1.5" />
          <path d="M 10,1 A 9,9 0 0,0 10,19 Z" fill="#d97706" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className={`inline-block ${dim} rounded-full border-2 border-gray-300 bg-gray-50`}
      title="Not addressed"
    />
  );
}
