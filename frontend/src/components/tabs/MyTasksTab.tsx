"use client";

import { motion } from "framer-motion";
import { Task } from "@/lib/types";
import { useUser } from "../UserContext";

const STATUS_CFG: Record<string, { label: string; dot: string; bg: string }> = {
  todo:        { label: "To Do",       dot: "#9ca3af", bg: "#f9fafb" },
  in_progress: { label: "In Progress", dot: "#3b82f6", bg: "#eff6ff" },
  done:        { label: "Done",        dot: "#10b981", bg: "#f0fdf4" },
};

const PRIORITY_STYLE: Record<string, { badge: string; text: string }> = {
  high:   { badge: "#fef2f2", text: "#ef4444" },
  medium: { badge: "#fffbeb", text: "#d97706" },
  low:    { badge: "#f0fdf4", text: "#16a34a" },
};

export function MyTasksTab({ tasks, onTaskClick }: {
  tasks: Task[];
  onTaskClick: (t: Task) => void;
}) {
  const { currentUser } = useUser();

  const myTasks = tasks.filter(t =>
    t.assignee?.toLowerCase() === currentUser?.name?.toLowerCase()
  );

  const todo   = myTasks.filter(t => t.status === "todo");
  const active = myTasks.filter(t => t.status === "in_progress");
  const done   = myTasks.filter(t => t.status === "done");

  const overdue = myTasks.filter(t =>
    t.due_date && new Date(t.due_date) < new Date() && t.status !== "done"
  );

  const totalPct = myTasks.length
    ? Math.round((done.length / myTasks.length) * 100)
    : 0;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Personal summary */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: "#e8eaf0" }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
            style={{ background: currentUser?.avatar_color || "#6c5ce7" }}>
            {currentUser?.name?.[0] || "?"}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">{currentUser?.name}</h2>
            <p className="text-xs text-gray-400">{currentUser?.role} · {currentUser?.department}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Total",       value: myTasks.length, color: "#6c5ce7" },
            { label: "Active",      value: active.length,  color: "#3b82f6" },
            { label: "Done",        value: done.length,    color: "#10b981" },
            { label: "Overdue",     value: overdue.length, color: "#ef4444" },
          ].map(s => (
            <div key={s.label} className="text-center p-3 rounded-xl bg-gray-50">
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {myTasks.length > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Overall progress</span>
              <span className="font-semibold" style={{ color: "#6c5ce7" }}>{totalPct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${totalPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #6c5ce7, #0984e3)" }} />
            </div>
          </div>
        )}
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="rounded-2xl border p-4" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
          <p className="text-sm font-semibold text-red-700 mb-2">{overdue.length} overdue task{overdue.length > 1 ? "s" : ""}</p>
          <div className="space-y-1.5">
            {overdue.map(t => (
              <button key={t.id} onClick={() => onTaskClick(t)}
                className="w-full text-left text-xs text-red-600 hover:text-red-800 transition-colors">
                · {t.title} ({t.project_name || "—"})
                {t.due_date && <span className="ml-1 text-red-400">— due {new Date(t.due_date).toLocaleDateString("en-US", { month:"short", day:"numeric" })}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Task groups */}
      {myTasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-3">🎉</p>
          <p className="text-sm font-medium">No tasks assigned to you yet</p>
        </div>
      ) : (
        [
          { id: "in_progress", tasks: active },
          { id: "todo",        tasks: todo   },
          { id: "done",        tasks: done   },
        ].map(group => {
          if (group.tasks.length === 0) return null;
          const cfg = STATUS_CFG[group.id];
          return (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cfg.label}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{group.tasks.length}</span>
              </div>
              <div className="space-y-2">
                {group.tasks.map((task, i) => {
                  const p = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium;
                  const pct = Number(task.progress_pct) || 0;
                  return (
                    <motion.button key={task.id} onClick={() => onTaskClick(task)}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="w-full bg-white rounded-2xl border p-4 text-left shadow-sm hover:shadow-md transition-shadow"
                      style={{ borderColor: "#e8eaf0" }}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-gray-900 leading-snug flex-1">{task.title}</p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 capitalize"
                          style={{ background: p.badge, color: p.text }}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.dot }}>
                          {task.project_name || "No project"}
                        </span>
                        {task.due_date && (
                          <span>Due {new Date(task.due_date).toLocaleDateString("en-US", { month:"short", day:"numeric" })}</span>
                        )}
                      </div>
                      {pct > 0 && group.id !== "done" && (
                        <div className="mt-2.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#6c5ce7" }} />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
