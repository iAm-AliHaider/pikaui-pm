"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Task, TeamMember, Comment } from "@/lib/types";
import { useLocale } from "../LocaleContext";

export function TaskModal({ task, team, onClose, onSave }: {
  task: Task;
  team: TeamMember[];
  onClose: () => void;
  onSave: (updates: Partial<Task>) => Promise<void>;
}) {
  const { t } = useLocale();
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [progress, setProgress] = useState(task.progress_pct || 0);
  const [hoursWorked, setHoursWorked] = useState(Number(task.hours_worked) || 0);
  const [hoursEstimated, setHoursEstimated] = useState(Number(task.hours_estimated) || 0);
  const [startDate, setStartDate] = useState(task.start_date?.slice(0, 10) || "");
  const [dueDate, setDueDate] = useState(task.due_date?.slice(0, 10) || "");
  const [description, setDescription] = useState(task.description || "");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/tasks/${task.id}`)
      .then(r => r.json())
      .then(d => { if (d.comments) setComments(d.comments); })
      .catch(() => {});
  }, [task.id]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      status, priority,
      progress_pct: progress,
      hours_worked: hoursWorked,
      hours_estimated: hoursEstimated,
      start_date: startDate || undefined,
      due_date: dueDate || undefined,
      description,
    });
    setSaving(false);
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    const res = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: "You", content: newComment }),
    });
    if (res.ok) {
      const c = await res.json();
      setComments(prev => [...prev, c]);
      setNewComment("");
    }
  };

  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== "done";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        onClick={e => e.stopPropagation()}
        className="relative bg-white rounded-2xl shadow-xl border w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4"
        style={{ borderColor: "#e8eaf0" }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b z-10 px-6 py-4 flex items-start justify-between" style={{ borderColor: "#e8eaf0" }}>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-gray-300">#{task.id.slice(0,6).toUpperCase()}</span>
              {task.project_name && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: (task.project_color||"#6c5ce7") + "18", color: task.project_color||"#6c5ce7" }}>{task.project_name}</span>}
              {isOverdue && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">{t("taskModal.overdue")}</span>}
            </div>
            <h2 className="text-lg font-bold text-gray-900">{task.title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">{t("taskModal.status")}</label>
              <select value={status} onChange={e => setStatus(e.target.value as Task["status"])}
                className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300" style={{ borderColor: "#e8eaf0" }}>
                <option value="todo">{t("status.todo")}</option>
                <option value="in_progress">{t("status.in_progress")}</option>
                <option value="done">{t("status.done")}</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">{t("taskModal.priority")}</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Task["priority"])}
                className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300" style={{ borderColor: "#e8eaf0" }}>
                <option value="low">{t("priority.low")}</option>
                <option value="medium">{t("priority.medium")}</option>
                <option value="high">{t("priority.high")}</option>
              </select>
            </div>
          </div>

          {/* Progress slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{t("taskModal.progress")}</label>
              <span className="text-sm font-bold" style={{ color: "#6c5ce7" }}>{progress}%</span>
            </div>
            <input type="range" min={0} max={100} value={progress} onChange={e => setProgress(+e.target.value)}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-purple-600" style={{ background: `linear-gradient(to right, #6c5ce7 ${progress}%, #e5e7eb ${progress}%)` }} />
          </div>

          {/* Time tracking */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">{t("taskModal.hoursWorked")}</label>
              <input type="number" step="0.5" min={0} value={hoursWorked} onChange={e => setHoursWorked(+e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300" style={{ borderColor: "#e8eaf0" }} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">{t("taskModal.hoursEst")}</label>
              <input type="number" step="0.5" min={0} value={hoursEstimated} onChange={e => setHoursEstimated(+e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300" style={{ borderColor: "#e8eaf0" }} />
            </div>
          </div>
          {hoursEstimated > 0 && (
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden -mt-2">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (hoursWorked / hoursEstimated) * 100)}%`, background: hoursWorked > hoursEstimated ? "#ef4444" : "linear-gradient(90deg,#6c5ce7,#0984e3)" }} />
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">{t("taskModal.startDate")}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300" style={{ borderColor: "#e8eaf0" }} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">{t("taskModal.dueDate")}</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300" style={{ borderColor: "#e8eaf0" }} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">{t("taskModal.description")}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder={t("taskModal.description")}
              className="w-full px-3 py-2 text-sm rounded-xl border resize-none focus:outline-none focus:border-purple-300" style={{ borderColor: "#e8eaf0" }} />
          </div>

          {/* Assignee */}
          {task.assignee && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}>
                {task.assignee[0]}
              </div>
              <span className="text-sm text-gray-700">{t("taskModal.assignedTo")} <span className="font-semibold">{task.assignee}</span></span>
            </div>
          )}

          {/* Comments */}
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-2">{t("taskModal.comments")} ({comments.length})</label>
            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="flex gap-2 p-2.5 rounded-lg bg-gray-50">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                    {c.author[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-700">{c.author}</span>
                      <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder={t("taskModal.addComment")}
                onKeyDown={e => e.key === "Enter" && handleComment()}
                className="flex-1 px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300" style={{ borderColor: "#e8eaf0" }} />
              <button onClick={handleComment} disabled={!newComment.trim()}
                className="px-3 py-2 text-xs font-medium text-white rounded-xl disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}>{t("taskModal.send")}</button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 rounded-b-2xl flex justify-end gap-2" style={{ borderColor: "#e8eaf0" }}>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">{t("taskModal.cancel")}</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}>
            {saving ? t("taskModal.saving") : t("taskModal.save")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
