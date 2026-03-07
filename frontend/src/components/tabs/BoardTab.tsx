"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Task, Project } from "@/lib/types";

const COLS = [
  { id: "todo",        label: "To Do",       dotColor: "#9ca3af", headerBg: "#f9fafb" },
  { id: "in_progress", label: "In Progress",  dotColor: "#3b82f6", headerBg: "#eff6ff" },
  { id: "done",        label: "Done",         dotColor: "#10b981", headerBg: "#f0fdf4" },
];

const PRIORITY_STYLE: Record<string, { dot: string; badge: string }> = {
  high:   { dot: "#ef4444", badge: "bg-red-50 text-red-500" },
  medium: { dot: "#f59e0b", badge: "bg-amber-50 text-amber-600" },
  low:    { dot: "#10b981", badge: "bg-emerald-50 text-emerald-600" },
};

export function BoardTab({ tasks, project, onTaskClick, onRefresh, onCreateTask, onDeleteTask }: {
  tasks: Task[];
  project: Project | undefined;
  onTaskClick: (t: Task) => void;
  onRefresh: () => void;
  onCreateTask: (defaultStatus: string) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [droppingCol, setDroppingCol] = useState<string | null>(null);

  const handleDrop = async (colId: string) => {
    if (!draggingId || draggingId === colId) return;
    setDroppingCol(null);
    await fetch(`/api/tasks/${draggingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: colId }),
    });
    setDraggingId(null);
    onRefresh();
  };

  const isOverdue = (t: Task) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done";

  return (
    <div className="p-5 h-full">
      <div className="flex gap-4 h-full" style={{ minHeight: "500px" }}>
        {COLS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id}
              className="flex-1 flex flex-col min-w-[220px] rounded-2xl overflow-hidden"
              style={{ background: col.headerBg, border: droppingCol === col.id ? `2px dashed ${col.dotColor}` : "2px solid transparent" }}
              onDragOver={e => { e.preventDefault(); setDroppingCol(col.id); }}
              onDragLeave={() => setDroppingCol(null)}
              onDrop={() => handleDrop(col.id)}
            >
              {/* Column header */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.dotColor }} />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{col.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onCreateTask(col.id)}
                    className="w-6 h-6 rounded-full border-2 border-dashed text-gray-400 hover:border-purple-400 hover:text-purple-500 text-sm font-bold transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/80 text-gray-500 shadow-sm">{colTasks.length}</span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                <AnimatePresence>
                  {colTasks.map(task => {
                    const p = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium;
                    return (
                      <motion.div key={task.id}
                        layout
                        initial={{ opacity:0, scale:0.97 }}
                        animate={{ opacity:1, scale:1 }}
                        exit={{ opacity:0, scale:0.97 }}
                        draggable
                        onDragStart={() => setDraggingId(task.id)}
                        onDragEnd={() => setDraggingId(null)}
                        onClick={() => onTaskClick(task)}
                        className="bg-white rounded-xl p-3.5 border cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group relative"
                        style={{
                          borderColor: isOverdue(task) ? "#fecaca" : "#e8eaf0",
                          background: isOverdue(task) ? "#fff5f5" : "white",
                          opacity: draggingId === task.id ? 0.5 : 1,
                        }}
                      >
                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Delete this task?")) {
                              onDeleteTask(task.id);
                            }
                          }}
                          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                        >
                          ×
                        </button>
                        {/* Priority + overdue */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${p.badge}`}>
                            {task.priority}
                          </span>
                          {isOverdue(task) && <span className="text-[10px] text-red-500 font-medium">Overdue</span>}
                        </div>

                        {/* Title */}
                        <p className="text-xs font-semibold text-gray-900 mb-2.5 line-clamp-2 leading-relaxed">{task.title}</p>

                        {/* Progress bar */}
                        {(task.progress_pct || 0) > 0 && (
                          <div className="mb-2.5">
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width:`${task.progress_pct}%`, background:"linear-gradient(90deg,#6c5ce7,#0984e3)" }} />
                            </div>
                            <p className="text-[9px] text-gray-400 mt-0.5 text-right">{task.progress_pct}%</p>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {task.assignee && (
                              <>
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                                  style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}>
                                  {task.assignee[0]}
                                </div>
                                <span className="text-[10px] text-gray-400">{task.assignee.split(" ")[0]}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400">
                            {(task.hours_worked || 0) > 0 && <span>⏱ {Number(task.hours_worked).toFixed(0)}h</span>}
                            {task.due_date && <span>{new Date(task.due_date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {colTasks.length === 0 && (
                  <div className="h-24 flex items-center justify-center rounded-xl border-2 border-dashed" style={{ borderColor: col.dotColor + "30" }}>
                    <span className="text-xs text-gray-300">Drop tasks here</span>
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
