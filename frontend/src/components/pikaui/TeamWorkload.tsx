"use client";
import { motion } from "framer-motion";

interface MemberData {
  name: string;
  role?: string;
  total: number | string;
  todo: number | string;
  in_progress: number | string;
  done: number | string;
}

export function TeamWorkload({ data = [] }: { data: MemberData[] }) {
  const maxTotal = Math.max(...data.map((d) => Number(d.total) || 0), 1);

  const avatarColors = [
    "linear-gradient(135deg,#6c5ce7,#0984e3)",
    "linear-gradient(135deg,#fd79a8,#e84393)",
    "linear-gradient(135deg,#00b894,#00cec9)",
    "linear-gradient(135deg,#fdcb6e,#e17055)",
    "linear-gradient(135deg,#a29bfe,#6c5ce7)",
  ];

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#fd79a8,#e84393)" }}>
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-800">Team Workload</h3>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4">
        {[
          { label: "To Do",       color: "#e5e7eb" },
          { label: "In Progress", color: "#3b82f6" },
          { label: "Done",        color: "#10b981" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
            <span className="text-[10px] text-gray-400">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Members */}
      <div className="space-y-4">
        {data.map((member, i) => {
          const total = Number(member.total) || 0;
          const todo = Number(member.todo) || 0;
          const inP = Number(member.in_progress) || 0;
          const done = Number(member.done) || 0;
          const pct = Math.round((total / maxTotal) * 100);

          return (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="flex items-center gap-3"
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: avatarColors[i % avatarColors.length] }}
              >
                {member.name[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-1.5">
                  <div>
                    <span className="text-xs font-semibold text-gray-800">{member.name}</span>
                    {member.role && <span className="ml-1.5 text-[10px] text-gray-400">{member.role}</span>}
                  </div>
                  <span className="text-xs font-bold text-gray-600">{total}</span>
                </div>

                {/* Stacked bar */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-full rounded-full" style={{ width: `${Math.round((done / maxTotal) * 100)}%`, background: "#10b981" }} />
                  <div className="h-full" style={{ width: `${Math.round((inP / maxTotal) * 100)}%`, background: "#3b82f6" }} />
                  <div className="h-full" style={{ width: `${Math.round((todo / maxTotal) * 100)}%`, background: "#e5e7eb" }} />
                </div>

                {/* Counts */}
                <div className="flex gap-3 mt-1">
                  <span className="text-[9px] text-gray-400">{todo} todo</span>
                  <span className="text-[9px] text-blue-400">{inP} active</span>
                  <span className="text-[9px] text-emerald-500">{done} done</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
