"use client";

import { LineChart, Line, YAxis, ResponsiveContainer } from "recharts";
import { trendLabel } from "@/lib/flock/home";

export function SkillTrend({ points, delta }: { points: number[]; delta: number | null }) {
  const data = points.map((score, i) => ({ i, score }));
  return (
    <div>
      {data.length >= 2 && (
        <div className="h-14 w-full" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
              <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
              <Line type="monotone" dataKey="score" stroke="#C0461C" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="font-body text-sm text-ink-soft">{trendLabel(delta)}</p>
    </div>
  );
}
