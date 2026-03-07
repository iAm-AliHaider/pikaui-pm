"use client";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface SprintData {
  sprint: string;
  completed: number;
  planned: number;
}

interface PriorityData {
  name: string;
  value: number;
}

interface SprintAnalyticsProps {
  sprintData: SprintData[];
  priorityData?: PriorityData[];
}

const PIE_COLORS = ["#ef4444", "#f59e0b", "#10b981"];

export function SprintAnalytics({ sprintData = [], priorityData = [] }: SprintAnalyticsProps) {
  // Velocity = completed/planned ratio
  const velocity = sprintData.map((s) => ({
    ...s,
    velocity: s.planned > 0 ? Math.round((s.completed / s.planned) * 100) : 0,
  }));

  return (
    <div className="p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}>
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-800">Sprint Analytics</h3>
      </div>

      {/* Velocity chart */}
      {sprintData.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Velocity (Completed vs Planned)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sprintData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="sprint" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "white", border: "1px solid #e8eaf0", borderRadius: 12, fontSize: 11 }}
                cursor={{ fill: "#f9fafb" }}
              />
              <Legend wrapperStyle={{ fontSize: 10, color: "#9ca3af" }} />
              <Bar dataKey="planned" name="Planned" fill="#e8eaf0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#6c5ce7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Priority pie */}
      {priorityData.length > 0 && (
        <div className="flex gap-6 items-center">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">By Priority</p>
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={priorityData} dataKey="value" innerRadius={30} outerRadius={55} paddingAngle={3}>
                  {priorityData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "white", border: "1px solid #e8eaf0", borderRadius: 8, fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2">
            {priorityData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-xs text-gray-600">{d.name}</span>
                <span className="text-xs font-semibold text-gray-800 ml-auto">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
