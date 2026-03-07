"use client";

import { motion } from "framer-motion";
import { Project, Task, TeamMember, Sprint } from "@/lib/types";

const AVATAR_GRADS = [
  "linear-gradient(135deg,#6c5ce7,#0984e3)",
  "linear-gradient(135deg,#fd79a8,#e84393)",
  "linear-gradient(135deg,#00b894,#00cec9)",
  "linear-gradient(135deg,#fdcb6e,#e17055)",
  "linear-gradient(135deg,#a29bfe,#6c5ce7)",
];

export function OverviewTab({ project, tasks, team, sprints, onTaskClick }: {
  project: Project | undefined;
  tasks: Task[];
  team: TeamMember[];
  sprints: Sprint[];
  onTaskClick: (t: Task) => void;
}) {
  if (!project) return <div className="p-8 text-gray-400 text-sm">No project selected.</div>;

  const pct = Math.round((Number(project.done_tasks) / Math.max(Number(project.total_tasks), 1)) * 100);
  const inProgress = tasks.filter(t => t.status === "in_progress");
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done");
  const hoursWorked = Number(project.hours_worked) || 0;
  const hoursEstimated = Number(project.hours_estimated) || 0;

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">

      {/* ── Project Card ── */}
      <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} className="lg:col-span-2 bg-white rounded-2xl border p-6 shadow-sm" style={{ borderColor:"#e8eaf0" }}>
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ background: project.color }}>
            {project.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900">{project.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: project.color + "18", color: project.color }}>
                {project.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">{project.description || "No description."}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Overall Progress</span>
            <span className="text-sm font-bold" style={{ color: project.color }}>{pct}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:1, ease:"easeOut" }}
              className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${project.color}, ${project.color}bb)` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
            <span>{Number(project.done_tasks)} completed</span>
            <span>{Number(project.total_tasks)} total tasks</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Manager", value: project.manager || "Unassigned" },
            { label: "Deadline", value: project.deadline ? new Date(project.deadline).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—" },
            { label: "Hours Worked", value: `${hoursWorked.toFixed(0)}h / ${hoursEstimated.toFixed(0)}h` },
            { label: "Budget", value: project.budget ? `$${Number(project.budget).toLocaleString()}` : "—" },
          ].map(s => (
            <div key={s.label} className="p-3 bg-gray-50 rounded-xl">
              <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">{s.label}</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{s.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Right column ── */}
      <div className="space-y-4">
        {/* Sprint status */}
        <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.1 }}
          className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor:"#e8eaf0" }}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Sprints
          </h3>
          {sprints.length === 0 ? (
            <p className="text-xs text-gray-400">No sprints yet.</p>
          ) : (
            <div className="space-y-2">
              {sprints.slice(0,3).map(s => (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-700 font-medium">{s.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{
                    background: s.status==="active" ? "#10b98118" : s.status==="completed" ? "#6c5ce718" : "#f3f4f6",
                    color: s.status==="active" ? "#10b981" : s.status==="completed" ? "#6c5ce7" : "#9ca3af"
                  }}>{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Overdue tasks */}
        {overdue.length > 0 && (
          <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.15 }}
            className="bg-red-50 rounded-2xl border border-red-100 p-4">
            <p className="text-xs font-semibold text-red-600 mb-2">⚠️ {overdue.length} Overdue</p>
            {overdue.slice(0,3).map(t => (
              <button key={t.id} onClick={() => onTaskClick(t)} className="w-full text-left mb-1.5 text-xs text-red-700 hover:underline truncate block">
                {t.title}
              </button>
            ))}
          </motion.div>
        )}

        {/* Team */}
        <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.2 }}
          className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor:"#e8eaf0" }}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Team</h3>
          <div className="space-y-2.5">
            {team.slice(0,5).map((m,i) => (
              <div key={m.id} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                  style={{ background: AVATAR_GRADS[i % AVATAR_GRADS.length] }}>
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{m.name}</p>
                  <p className="text-[10px] text-gray-400">{m.role}</p>
                </div>
                <span className="text-[10px] font-semibold text-gray-500">{m.total_tasks}t</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Active Tasks ── */}
      <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.25 }}
        className="lg:col-span-3 bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor:"#e8eaf0" }}>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">In Progress ({inProgress.length})</h3>
        {inProgress.length === 0
          ? <p className="text-sm text-gray-400">No active tasks.</p>
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {inProgress.map(task => (
                <button key={task.id} onClick={() => onTaskClick(task)}
                  className="text-left p-4 rounded-xl border hover:shadow-md hover:border-purple-200 transition-all group"
                  style={{ borderColor:"#e8eaf0" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{
                      background: task.priority==="high" ? "#ef4444" : task.priority==="medium" ? "#f59e0b" : "#10b981"
                    }} />
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">{task.priority}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 mb-3 line-clamp-2">{task.title}</p>
                  <div className="h-1.5 bg-gray-100 rounded-full mb-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${task.progress_pct}%`, background:"linear-gradient(90deg,#6c5ce7,#0984e3)" }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>{task.assignee || "Unassigned"}</span>
                    <span>{task.progress_pct}%</span>
                  </div>
                </button>
              ))}
            </div>
          )}
      </motion.div>
    </div>
  );
}
