
import React, { useMemo } from "react";

export default function HeatmapGrid({ rows, cols, data }) {
  const maxVal = useMemo(() => Math.max(1, ...data.flat().map((n) => Number(n || 0))), [data]);
  const cellBg = (val, rIdx) => {
    const hue = rIdx === 0 ? 0 : rIdx === 1 ? 30 : 145; // red, amber, green
    const alpha = Math.min(1, (val / maxVal) * 0.85 + 0.12);
    return `hsla(${hue} 85% 50% / ${alpha})`;
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="w-36 p-2 text-left text-slate-500 text-sm font-medium align-bottom">
              <span className="inline-block">Severity ↓ / Score →</span>
            </th>
            {cols.map((c) => (
              <th key={c} className="p-2 text-slate-500 text-sm font-medium text-center">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, rIdx) => (
            <tr key={r}>
              <th className="sticky left-0 bg-white p-2 pr-3 text-sm font-semibold text-slate-700 text-left">{r}</th>
              {data[rIdx].map((val, cIdx) => (
                <td key={`${rIdx}-${cIdx}`} className="p-0">
                  <div
                    className="h-14 grid place-items-center text-sm font-semibold rounded-md m-1"
                    style={{ background: cellBg(val, rIdx), color: val ? "white" : "#475569" }}
                    title={`${r} • ${cols[cIdx]} • ${val || 0}`}
                  >
                    {val || 0}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex gap-4 items-center">
        <LegendDot color="hsl(0 85% 50%)" label="High" />
        <LegendDot color="hsl(30 85% 50%)" label="Medium" />
        <LegendDot color="hsl(145 60% 40%)" label="Low" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-2 text-slate-600 text-sm">
      <span className="w-3 h-3 rounded-full" style={{ background: color }}></span>
      {label}
    </span>
  );
}
