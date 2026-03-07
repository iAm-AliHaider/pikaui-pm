"use client";
import { motion } from "framer-motion";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  todo:        { bg: "bg-gray-100",    text: "text-gray-600",   label: "To Do" },
  in_progress: { bg: "bg-blue-50",    text: "text-blue-600",   label: "In Progress" },
  done:        { bg: "bg-emerald-50", text: "text-emerald-600", label: "Done" },
};

const PRIORITY_COLORS: Record<string, { bar: string; badge: string }> = {
  high:   { bar: "#ef4444", badge: "bg-red-50 text-red-500" },
  medium: { bar: "#f59e0b", badge: "bg-amber-50 text-amber-600" },
  low:    { bar: "#10b981", badge: "bg-emerald-50 text-emerald-600" },
};

export function TaskCard({ task }: { task: Task }) {
  const s = STATUS_COLORS[task?.status] || STATUS_COLORS.todo;
  const p = PRIORITY_COLORS[task?.priority] || PRIORITY_COLORS.medium;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="p-5"
    >
      <div className="flex items-start gap-4">
        {/* Priority bar */}
        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: p.bar }} />

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-sm font-semibold text-gray-900 mb-3 leading-snug">{task?.title}</h3>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${p.badge}`}>
              {task?.priority}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
              {s.label}
            </span>
          </div>

          {/* Assignee */}
          {task?.assignee && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: "#f3f4f6" }}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}
              >
                {task.assignee[0]}
              </div>
              <span className="text-xs text-gray-500">Assigned to <span className="font-medium text-gray-700">{task.assignee}</span></span>
            </div>
          )}
        </div>

        {/* ID chip */}
        <span className="text-[9px] font-mono text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded flex-shrink-0">
          #{task?.id?.slice(0, 6).toUpperCase()}
        </span>
      </div>
    </motion.div>
  );
}
