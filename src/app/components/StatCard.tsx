import React from "react";

interface Props {
  value: number | string;
  label: string;
  icon: React.ReactNode;
  accent?: string;
}

export function StatCard({ value, label, icon, accent = "emerald" }: Props) {
  const bg: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue:    "bg-blue-50 text-blue-600",
    red:     "bg-red-50 text-red-600",
    amber:   "bg-amber-50 text-amber-600",
    purple:  "bg-purple-50 text-purple-600",
    teal:    "bg-teal-50 text-teal-600",
  };
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 flex gap-4 items-start shadow-sm">
      <div className={`rounded-xl p-3 ${bg[accent] ?? bg.emerald}`}>{icon}</div>
      <div>
        <p className="text-3xl font-bold text-stone-900 tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-sm text-stone-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}
