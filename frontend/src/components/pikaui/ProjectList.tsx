"use client";
import { motion } from "framer-motion";

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  total_tasks: number | string;
  done_tasks: number | string;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  active:   { bg: "bg-emerald-50", text: "text-emerald-600", dot: "#10b981" },
  planning: { bg: "bg-blue-50",   text: "text-blue-600",    dot: "#3b82f6" },
  paused:   { bg: "bg-amber-50",  text: "text-amber-600",   dot: "#f59e0b" },
  done:     { bg: "bg-gray-100",  text: "text-gray-500",    dot: "#9ca3af" },
};

const GRAD_COLORS = [
  "linear-gradient(135deg,#6c5ce7,#0984e3)",
  "linear-gradient(135deg,#fd79a8,#e84393)",
  "linear-gradient(135deg,#00b894,#00cec9)",
  "linear-gradient(135deg,#fdcb6e,#e17055)",
];

export function ProjectList({ projects = [] }: { projects: Project[] }) {
  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}>
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-800">Projects ({projects.length})</h3>
      </div>

      {/* Project cards */}
      <div className="grid gap-3">
        {projects.map((proj, i) => {
          const total = Number(proj.total_tasks) || 0;
          const done  = Number(proj.done_tasks) || 0;
          const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
          const s = STATUS_STYLE[proj.status] || STATUS_STYLE.active;

          return (
            <motion.div
              key={proj.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-4 p-4 rounded-xl border hover:shadow-sm transition-all"
              style={{ borderColor: "#e8eaf0" }}
            >
              {/* Color icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: GRAD_COLORS[i % GRAD_COLORS.length] }}
              >
                {proj.name[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-gray-800 truncate">{proj.name}</h4>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize flex-shrink-0 ${s.bg} ${s.text}`}>
                    {proj.status}
                  </span>
                </div>
                {proj.description && (
                  <p className="text-xs text-gray-400 mb-2 truncate">{proj.description}</p>
                )}
                {/* Progress */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: "linear-gradient(90deg,#6c5ce7,#0984e3)" }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{done}/{total} done</span>
                </div>
              </div>

              {/* Pct badge */}
              <div className="text-right flex-shrink-0">
                <span className="text-lg font-bold" style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {pct}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
