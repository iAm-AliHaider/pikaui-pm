"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Project, TeamMember } from "@/lib/types";

interface CreateTaskModalProps {
  projects: Project[];
  team: TeamMember[];
  defaultProjectId?: string;
  defaultStatus?: string;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTaskModal({
  projects,
  team,
  defaultProjectId,
  defaultStatus = "todo",
  onClose,
  onCreated,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId || (projects[0]?.id ?? ""));
  const [status, setStatus] = useState(defaultStatus);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [assigneeName, setAssigneeName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [hoursEstimated, setHoursEstimated] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          project_id: projectId,
          status,
          priority,
          assignee_name: assigneeName || undefined,
          due_date: dueDate || undefined,
          hours_estimated: hoursEstimated ? Number(hoursEstimated) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create task");
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const priorityColors = {
    low: { bg: "bg-emerald-50", text: "text-emerald-600", active: "bg-emerald-500 text-white" },
    medium: { bg: "bg-amber-50", text: "text-amber-600", active: "bg-amber-500 text-white" },
    high: { bg: "bg-red-50", text: "text-red-500", active: "bg-red-500 text-white" },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-2xl shadow-xl border w-full max-w-lg max-h-[85vh] overflow-y-auto mx-4"
        style={{ borderColor: "#e8eaf0" }}
      >
        <div className="sticky top-0 bg-white rounded-t-2xl border-b z-10 px-6 py-4 flex items-center justify-between" style={{ borderColor: "#e8eaf0" }}>
          <h2 className="text-lg font-bold text-gray-900">Create New Task</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Title *</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300"
              style={{ borderColor: "#e8eaf0" }}
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description..."
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-xl border resize-none focus:outline-none focus:border-purple-300"
              style={{ borderColor: "#e8eaf0" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300"
                style={{ borderColor: "#e8eaf0" }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300"
                style={{ borderColor: "#e8eaf0" }}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Priority</label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                    priority === p
                      ? priorityColors[p].active
                      : `${priorityColors[p].bg} ${priorityColors[p].text} border-transparent`
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Assignee</label>
            <select
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300"
              style={{ borderColor: "#e8eaf0" }}
            >
              <option value="">Unassigned</option>
              {team.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300"
                style={{ borderColor: "#e8eaf0" }}
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Hours Estimated</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={hoursEstimated}
                onChange={(e) => setHoursEstimated(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300"
                style={{ borderColor: "#e8eaf0" }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}
            >
              {saving ? "Saving..." : "Save Task"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
