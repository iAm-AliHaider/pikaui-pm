"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardData, Task, AnalyticsData } from "@/lib/types";
import { OverviewTab }    from "./tabs/OverviewTab";
import { BoardTab }       from "./tabs/BoardTab";
import { TeamTab }        from "./tabs/TeamTab";
import { DocsTab }        from "./tabs/DocsTab";
import { TaskModal }      from "./modals/TaskModal";
import { CreateTaskModal }    from "./modals/CreateTaskModal";
import { CreateProjectModal } from "./modals/CreateProjectModal";
import { useLocale, LanguageToggle } from "./LocaleContext";
import dynamic from "next/dynamic";

// Lazy-load heavy chart tabs
const AnalyticsTab   = dynamic(() => import("./tabs/AnalyticsTab").then(m => ({ default: m.AnalyticsTab })), { ssr: false, loading: () => <TabSkeleton /> });
const MilestonesTab  = dynamic(() => import("./tabs/MilestonesTab").then(m => ({ default: m.MilestonesTab })), { ssr: false, loading: () => <TabSkeleton /> });
const TimeLogTab     = dynamic(() => import("./tabs/TimeLogTab").then(m => ({ default: m.TimeLogTab })), { ssr: false, loading: () => <TabSkeleton /> });
const ActivityFeedTab = dynamic(() => import("./tabs/ActivityFeedTab").then(m => ({ default: m.ActivityFeedTab })), { ssr: false, loading: () => <TabSkeleton /> });
const SummaryTab      = dynamic(() => import("./tabs/SummaryTab").then(m => ({ default: m.SummaryTab })), { ssr: false, loading: () => <TabSkeleton /> });

function TabSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => (
        <div key={i} className="h-32 rounded-2xl bg-gray-50 animate-pulse" />
      ))}
    </div>
  );
}

interface DashboardProps {
  data: DashboardData;
  analyticsData: AnalyticsData | null;
  analyticsLoading: boolean;
  activeTab: string;
  setActiveTab: (t: string) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string) => void;
  selectedTask: Task | null;
  setSelectedTask: (t: Task | null) => void;
  onRefresh: () => void;
  onRefreshAnalytics: () => void;
  languageToggle?: React.ReactNode;
}

export function Dashboard({
  data, analyticsData, analyticsLoading,
  activeTab, setActiveTab,
  activeProjectId, setActiveProjectId,
  selectedTask, setSelectedTask,
  onRefresh, onRefreshAnalytics,
  languageToggle,
}: DashboardProps) {
  const { t } = useLocale();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState("todo");
  const [showCreateProject, setShowCreateProject] = useState(false);

  const TABS = [
    { id: "overview",    label: t("tab.overview"),    icon: "O" },
    { id: "board",       label: t("tab.board"),       icon: "B" },
    { id: "team",        label: t("tab.team"),        icon: "T" },
    { id: "docs",        label: t("tab.documents"),   icon: "D" },
    { id: "analytics",   label: t("tab.analytics"),  icon: "A" },
    { id: "milestones",  label: t("tab.milestones"),  icon: "M" },
    { id: "timelog",     label: t("tab.timelog"),     icon: "L" },
    { id: "activity",    label: t("tab.activity"),    icon: "X" },
    { id: "summary",     label: t("tab.summary"),     icon: "S" },
  ];

  const activeProject = data.projects.find(p => p.id === activeProjectId) ?? data.projects[0];
  // Use the resolved project id (with fallback) so filters never return empty due to null activeProjectId
  const resolvedProjectId = activeProject?.id ?? null;
  const projectTasks  = data.tasks.filter(t => t.project_id === resolvedProjectId);
  const projectDocs   = data.documents.filter(d => d.project_id === resolvedProjectId);

  const completionPct = activeProject
    ? Math.round((Number(activeProject.done_tasks) / Math.max(Number(activeProject.total_tasks), 1)) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* ── Top Header ────────────────────────────────── */}
      <header className="flex-shrink-0 bg-white border-b px-6 py-3" style={{ borderColor: "#e8eaf0" }}>
        <div className="flex items-center justify-between gap-4">
          {/* Project selector */}
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
            {data.projects.map(p => (
              <button
                key={p.id}
                onClick={() => setActiveProjectId(p.id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex-shrink-0"
                style={{
                  background: p.id === activeProjectId ? p.color + "18" : "transparent",
                  color: p.id === activeProjectId ? p.color : "#6b7280",
                  border: `1.5px solid ${p.id === activeProjectId ? p.color + "40" : "transparent"}`,
                }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                <span className="hidden sm:inline">{p.name}</span>
                <span className="sm:hidden">{p.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          {/* Project stats */}
          {activeProject && (
            <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="font-semibold text-gray-800">{Number(activeProject.done_tasks)}</span>
                <span>/ {Number(activeProject.total_tasks)} tasks</span>
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${completionPct}%`, background: activeProject.color }} />
                </div>
                <span className="font-semibold" style={{ color: activeProject.color }}>{completionPct}%</span>
              </div>
              {activeProject.deadline && (
                <span className="hidden md:inline text-gray-400">
                  Due {new Date(activeProject.deadline).toLocaleDateString("en-US", { month:"short", day:"numeric" })}
                </span>
              )}
              {/* Risk badge */}
              {(analyticsData?.risks?.length ?? 0) > 0 && (
                <button
                  onClick={() => setActiveTab("analytics")}
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold animate-pulse"
                  style={{ background: "#fee2e2", color: "#ef4444" }}
                >
                  {analyticsData!.risks.length} {(analyticsData!.risks.length === 1 ? t("header.risks") : t("header.risks.plural"))}
                </button>
              )}
            </div>
          )}

          {/* New Task & New Project buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowCreateTask(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl text-white"
              style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}
            >
              {t("header.newTask")}
            </button>
            <button
              onClick={() => setShowCreateProject(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border"
              style={{ borderColor: "#6c5ce7", color: "#6c5ce7" }}
            >
              {t("header.newProject")}
            </button>
            {languageToggle}
          </div>
        </div>
      </header>

      {/* ── Tab Bar ───────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-b overflow-x-auto" style={{ borderColor: "#e8eaf0" }}>
        <div className="flex gap-1 px-6 min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap"
              style={{ color: activeTab === tab.id ? "#6c5ce7" : "#9ca3af" }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: "#6c5ce7" }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === "overview" && (
              <OverviewTab
                project={activeProject}
                tasks={projectTasks}
                team={data.team}
                sprints={data.sprints.filter(s => s.project_id === activeProjectId)}
                onTaskClick={setSelectedTask}
                onCreateTask={() => setShowCreateTask(true)}
              />
            )}
            {activeTab === "board" && (
              <BoardTab
                tasks={projectTasks}
                project={activeProject}
                onTaskClick={setSelectedTask}
                onRefresh={onRefresh}
                onCreateTask={(status) => { setCreateTaskStatus(status); setShowCreateTask(true); }}
                onDeleteTask={async (taskId) => {
                  await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
                  onRefresh();
                }}
              />
            )}
            {activeTab === "team" && (
              <TeamTab team={data.team} tasks={data.tasks} onTaskClick={setSelectedTask} />
            )}
            {activeTab === "docs" && (
              <DocsTab
                documents={projectDocs}
                projectId={activeProjectId ?? ""}
                projectName={activeProject?.name ?? ""}
                onRefresh={onRefresh}
              />
            )}
            {activeTab === "analytics" && (
              analyticsLoading ? <TabSkeleton /> :
              analyticsData ? (
                <AnalyticsTab
                  data={analyticsData}
                  projectId={activeProjectId ?? ""}
                  projectName={activeProject?.name ?? ""}
                />
              ) : (
                <div className="p-6 text-center text-sm text-gray-400">
                  <p className="text-2xl mb-2">📊</p>
                  <p>Analytics unavailable. Check your database connection.</p>
                </div>
              )
            )}
            {activeTab === "milestones" && (
              <MilestonesTab
                milestones={(analyticsData?.milestones ?? [])}
                projectId={activeProjectId ?? ""}
                projectName={activeProject?.name ?? ""}
                onRefresh={onRefreshAnalytics}
              />
            )}
            {activeTab === "timelog" && (
              <TimeLogTab
                projectId={activeProjectId ?? ""}
                projectName={activeProject?.name ?? ""}
                team={data.team}
              />
            )}
            {activeTab === "activity" && (
              <ActivityFeedTab
                projectId={activeProjectId ?? ""}
                projectName={activeProject?.name ?? ""}
              />
            )}
            {activeTab === "summary" && (
              <SummaryTab />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Task Modal ────────────────────────────────── */}
      <AnimatePresence>
        {selectedTask && (
          <TaskModal
            task={selectedTask}
            team={data.team}
            onClose={() => setSelectedTask(null)}
            onSave={async (updates) => {
              await fetch(`/api/tasks/${selectedTask.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
              });
              setSelectedTask(null);
              onRefresh();
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Create Task Modal ────────────────────────────── */}
      {showCreateTask && (
        <CreateTaskModal
          projects={data.projects}
          team={data.team}
          defaultProjectId={activeProjectId ?? undefined}
          defaultStatus={createTaskStatus}
          onClose={() => setShowCreateTask(false)}
          onCreated={() => { setShowCreateTask(false); onRefresh(); }}
        />
      )}

      {/* ── Create Project Modal ──────────────────────────── */}
      {showCreateProject && (
        <CreateProjectModal
          team={data.team}
          onClose={() => setShowCreateProject(false)}
          onCreated={() => { setShowCreateProject(false); onRefresh(); }}
        />
      )}
    </div>
  );
}
