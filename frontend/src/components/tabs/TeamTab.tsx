"use client";

import { motion } from "framer-motion";
import { TeamMember, Task } from "@/lib/types";

const AVATAR_GRADS = [
  "linear-gradient(135deg,#6c5ce7,#0984e3)",
  "linear-gradient(135deg,#fd79a8,#e84393)",
  "linear-gradient(135deg,#00b894,#00cec9)",
  "linear-gradient(135deg,#fdcb6e,#e17055)",
  "linear-gradient(135deg,#a29bfe,#6c5ce7)",
];

export function TeamTab({ team, tasks, onTaskClick }: {
  team: TeamMember[];
  tasks: Task[];
  onTaskClick: (t: Task) => void;
}) {
  const maxTasks = Math.max(...team.map(m => Number(m.total_tasks)), 1);

  return (
    <div className="p-6 space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {[
          { label: "Members", value: team.length },
          { label: "Total Tasks", value: tasks.length },
          { label: "In Progress", value: tasks.filter(t => t.status === "in_progress").length },
          { label: "Completed", value: tasks.filter(t => t.status === "done").length },
          { label: "Hours Logged", value: `${team.reduce((a, m) => a + Number(m.hours_worked), 0).toFixed(0)}h` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4 text-center shadow-sm" style={{ borderColor:"#e8eaf0" }}>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Member cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {team.map((member, i) => {
          const memberTasks = tasks.filter(t => t.assignee === member.name);
          const todo = Number(member.todo);
          const inP  = Number(member.in_progress);
          const done = Number(member.done);
          const total= Number(member.total_tasks);
          const donePct = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <motion.div key={member.id}
              initial={{ opacity:0, y:12 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white rounded-2xl border shadow-sm overflow-hidden"
              style={{ borderColor:"#e8eaf0" }}
            >
              {/* Card header */}
              <div className="p-5 border-b" style={{ borderColor:"#f3f4f6" }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: AVATAR_GRADS[i % AVATAR_GRADS.length] }}>
                    {member.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-400">{member.role}</p>
                    {member.department && <p className="text-[10px] text-gray-300">{member.department}</p>}
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xl font-bold" style={{ background: AVATAR_GRADS[i % AVATAR_GRADS.length], WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {donePct}%
                    </p>
                    <p className="text-[10px] text-gray-400">done</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="px-5 py-4">
                {/* Stacked bar */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex mb-3">
                  <div style={{ width:`${(done/maxTasks)*100}%`, background:"#10b981" }} />
                  <div style={{ width:`${(inP/maxTasks)*100}%`, background:"#3b82f6" }} />
                  <div style={{ width:`${(todo/maxTasks)*100}%`, background:"#e5e7eb" }} />
                </div>
                <div className="flex gap-4 text-[10px] mb-4">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block"/>{todo} todo</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>{inP} active</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>{done} done</span>
                  <span className="ml-auto text-gray-400">⏱ {Number(member.hours_worked).toFixed(0)}h</span>
                </div>

                {/* Task list */}
                <div className="space-y-1.5">
                  {memberTasks.slice(0,4).map(t => (
                    <button key={t.id} onClick={() => onTaskClick(t)}
                      className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                        background: t.status==="done" ? "#10b981" : t.status==="in_progress" ? "#3b82f6" : "#d1d5db"
                      }} />
                      <span className="text-xs text-gray-700 truncate flex-1">{t.title}</span>
                      <span className="text-[9px] text-gray-400 group-hover:text-purple-500 transition-colors">{t.progress_pct}%</span>
                    </button>
                  ))}
                  {memberTasks.length > 4 && (
                    <p className="text-[10px] text-gray-400 pl-2.5">+{memberTasks.length - 4} more tasks</p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
