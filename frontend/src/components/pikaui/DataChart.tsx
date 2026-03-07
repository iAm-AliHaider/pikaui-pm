"use client";

interface DataItem { name: string; value: number; }

interface DataChartProps {
  title: string;
  data: DataItem[];
  type: "bar" | "line" | "pie";
}

export function DataChart({ title, data, type }: DataChartProps) {
  const maxVal = Math.max(...data.map((d: DataItem) => d.value), 1);

  return (
    <div className="p-4">
      <h3 className="text-white font-semibold text-sm mb-3">{title}</h3>
      {type === "bar" && (
        <div className="space-y-2">
          {data.map((item: DataItem, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[10px] text-zinc-500 w-12 truncate text-right">{item.name}</span>
              <div className="flex-1 h-6 bg-zinc-800 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-lg transition-all duration-700"
                  style={{ width: `${(item.value / maxVal) * 100}%` }}
                />
              </div>
              <span className="text-xs text-zinc-400 w-10 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      )}
      {type === "line" && (
        <svg viewBox={`0 0 ${data.length * 60} 100`} className="w-full h-24">
          <polyline
            fill="none"
            stroke="url(#grad)"
            strokeWidth="2"
            points={data.map((d: DataItem, i: number) => `${i * 60 + 30},${100 - (d.value / maxVal) * 80}`).join(" ")}
          />
          {data.map((d: DataItem, i: number) => (
            <circle key={i} cx={i * 60 + 30} cy={100 - (d.value / maxVal) * 80} r="3" fill="#8B5CF6" />
          ))}
          <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#06B6D4" /></linearGradient></defs>
        </svg>
      )}
      {type === "pie" && (
        <div className="flex flex-wrap gap-2 mt-2">
          {data.map((item: DataItem, i: number) => {
            const total = data.reduce((s: number, d: DataItem) => s + d.value, 0);
            const pct = ((item.value / total) * 100).toFixed(0);
            return (
              <div key={i} className="flex items-center gap-1.5 bg-zinc-800/50 px-2 py-1 rounded-lg">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${i * 60 + 260}, 70%, 60%)` }} />
                <span className="text-[10px] text-zinc-400">{item.name} {pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
