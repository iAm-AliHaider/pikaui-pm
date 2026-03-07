"use client";
import { motion, AnimatePresence } from "framer-motion";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: string | null;
}

interface KanbanBoardProps {
  tasks: Task[];
  projectName?: string;
}

const PRIORITY_DOT: Record<string, string> = {
  high:   "#ef4444",
  medium: "#f59e0b",
  low:    "#10b981",
};

const PRIORITY_BADGE: Record<string, string> = {
  high:   "bg-red-50 text-red-600",
  medium: "bg-amber-50 text-amber-600",
  low:    "bg-emerald-50 text-emerald-600",
};

const COLS = [
  { id: "todo",        label: "To Do",       headerBg: "bg-gray-100",    dot: "#9ca3af" },
  { id: "in_progress", label: "In Progress",  headerBg: "bg-blue-50",     dot: "#3b82f6" },
  { id: "done",        label: "Done",         headerBg: "bg-emerald-50",  dot: "#10b981" },
];

export function KanbanBoard({ tasks, projectName }: KanbanBoardProps) {
  return (
    <div className="p-5">
      {/* Title */}
      {projectName && (
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 rounded" style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }} />
          <h3 className="text-sm font-semibold text-gray-800">{projectName}</h3>
        </div>
      )}

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-1" style={{ minWidth: "600px" }}>
        {COLS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="flex-1 flex flex-col min-w-[180px]">
              {/* Column header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-xl mb-3 ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{col.label}</span>
                </div>
                <span className="text-xs font-bold text-gray-500 bg-white/70 px-1.5 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 flex-1">
                <AnimatePresence mode="popLayout">
                  {colTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="p-3 bg-white rounded-xl border hover:shadow-md transition-all group"
                      style={{ borderColor: "#e8eaf0" }}
                    >
                      {/* Priority + ID */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium}`}>
                          {task.priority}
                        </span>
                        <span className="text-[9px] text-gray-300 font-mono">#{task.id.slice(0, 4).toUpperCase()}</span>
                      </div>

                      {/* Title */}
                      <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-relaxed">{task.title}</p>

                      {/* Assignee */}
                      {task.assignee && (
                        <div className="flex items-center gap-1.5 mt-2.5">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                            style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}
                          >
                            {task.assignee[0]}
                          </div>
                          <span className="text-[10px] text-gray-400">{task.assignee}</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {colTasks.length === 0 && (
                  <div className="flex-1 flex items-center justify-center py-8 rounded-xl border-2 border-dashed" style={{ borderColor: "#e8eaf0" }}>
                    <span className="text-xs text-gray-300">Empty</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
