"use client";

import { useState } from "react";
import { VoiceAgent } from "./VoiceAgent";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "./LocaleContext";
import dynamic from "next/dynamic";

const StatusBanner = dynamic(() => import("./pikaui/StatusBanner").then(m => ({ default: m.StatusBanner })), { ssr: false });
const TaskCard     = dynamic(() => import("./pikaui/TaskCard").then(m => ({ default: m.TaskCard })), { ssr: false });
const ProjectList  = dynamic(() => import("./pikaui/ProjectList").then(m => ({ default: m.ProjectList })), { ssr: false });
const RagResult    = dynamic(() => import("./pikaui/RagResult").then(m => ({ default: m.RagResult })), { ssr: false });
const RiskPanel    = dynamic(() => import("./pikaui/RiskPanel").then(m => ({ default: m.RiskPanel })), { ssr: false });

const WIDGET_COMPONENTS: Record<string, React.ComponentType<Record<string, unknown>>> = {
  StatusBanner: StatusBanner as unknown as React.ComponentType<Record<string, unknown>>,
  TaskCard:     TaskCard     as unknown as React.ComponentType<Record<string, unknown>>,
  ProjectList:  ProjectList  as unknown as React.ComponentType<Record<string, unknown>>,
  RagResult:    RagResult    as unknown as React.ComponentType<Record<string, unknown>>,
  RiskPanel:    RiskPanel    as unknown as React.ComponentType<Record<string, unknown>>,
};

interface Widget { id: string; component: string; props: Record<string, unknown> }

export function VoiceSidebar({ voiceWidgets, onClearWidgets }: {
  voiceWidgets: Widget[];
  onClearWidgets: () => void;
}) {
  const { t } = useLocale();
  const [activeGroup, setActiveGroup] = useState(0);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const CMD_GROUPS = [
    {
      label: t("voice.projects"),
      color: "#6c5ce7",
      cmds: [
        { icon: "📋", label: "All projects",   say: "Show me all projects" },
        { icon: "📊", label: "Analytics",      say: "Show full analytics" },
        { icon: "📈", label: "Daily standup",  say: "Daily standup" },
        { icon: "⚠️", label: "Detect risks",   say: "Detect risks" },
        { icon: "🏢", label: "Summary",        say: "Cross project summary" },
      ],
    },
    {
      label: t("voice.boardCmds"),
      color: "#0984e3",
      cmds: [
        { icon: "▦",  label: "Show board",     say: "Show the board" },
        { icon: "✅", label: "Done tasks",     say: "Search done tasks" },
        { icon: "🔴", label: "High priority",  say: "Search high priority tasks" },
        { icon: "➕", label: "New task",       say: "Create a new high priority task" },
        { icon: "🔍", label: "Search",         say: "Search in progress tasks" },
      ],
    },
    {
      label: t("voice.teamCmds"),
      color: "#00b894",
      cmds: [
        { icon: "👥", label: "Workload",       say: "Show team workload" },
        { icon: "💡", label: "Suggest assign", say: "Suggest who to assign the next task to" },
        { icon: "⏱",  label: "Log 2h",         say: "Log 2 hours on the current task" },
        { icon: "🕐", label: "Activity",       say: "Show recent activity" },
        { icon: "🏆", label: "Top performer",  say: "Who has the most completed tasks" },
      ],
    },
    {
      label: t("voice.insights"),
      color: "#fd79a8",
      cmds: [
        { icon: "🏁", label: "Milestones",     say: "Show milestones" },
        { icon: "💰", label: "Budget",         say: "Show analytics" },
        { icon: "📄", label: "Search docs",    say: "Search docs for deployment guide" },
        { icon: "🗓", label: "Sprint status",  say: "Show sprint analytics" },
        { icon: "🚀", label: "New sprint",     say: "Create sprint" },
      ],
    },
  ];

  const handleCmdClick = (say: string) => {
    setHighlighted(say);
    navigator.clipboard?.writeText(say).catch(() => {});
    setTimeout(() => setHighlighted(null), 2000);
  };

  return (
    <aside className="flex-shrink-0 w-[280px] flex flex-col bg-white border-r overflow-hidden" style={{ borderColor: "#e8eaf0" }}>

      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: "#e8eaf0" }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}>
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{t("voice.title")}</p>
          <p className="text-[10px] text-gray-400">Voice Project Manager</p>
        </div>
      </div>

      {/* Mic */}
      <div className="flex justify-center py-5 border-b" style={{ borderColor: "#f3f4f6" }}>
        <VoiceAgent />
      </div>

      {/* Highlighted command prompt */}
      <AnimatePresence>
        {highlighted && (
          <motion.div
            initial={{ opacity:0, height:0 }}
            animate={{ opacity:1, height:"auto" }}
            exit={{ opacity:0, height:0 }}
            className="overflow-hidden border-b"
            style={{ borderColor: "#f3f4f6" }}
          >
            <div className="px-4 py-2 text-center">
              <p className="text-[9px] uppercase tracking-wider text-purple-500 font-semibold mb-0.5">{t("voice.sayNow")}</p>
              <p className="text-xs font-medium text-gray-800">&ldquo;{highlighted}&rdquo;</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick command groups */}
      <div className="border-b" style={{ borderColor: "#f3f4f6" }}>
        {/* Group tabs */}
        <div className="flex px-2 pt-2 gap-1">
          {CMD_GROUPS.map((g, i) => (
            <button key={g.label} onClick={() => setActiveGroup(i)}
              className="flex-1 py-1 text-[9px] font-semibold rounded-lg transition-all"
              style={{
                background: activeGroup===i ? g.color+"18" : "transparent",
                color: activeGroup===i ? g.color : "#9ca3af",
              }}>
              {g.label}
            </button>
          ))}
        </div>
        {/* Commands grid */}
        <div className="px-3 pb-3 pt-1.5 grid grid-cols-2 gap-1.5">
          {CMD_GROUPS[activeGroup].cmds.map(c => (
            <button key={c.say} onClick={() => handleCmdClick(c.say)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition-all hover:shadow-sm group"
              style={{ borderColor: "#e8eaf0" }}
              title={`Say: "${c.say}"`}
            >
              <span className="text-sm leading-none flex-shrink-0">{c.icon}</span>
              <span className="text-[10px] text-gray-600 group-hover:text-purple-600 leading-tight">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Voice widgets stack */}
      <div className="flex-1 overflow-y-auto">
        {voiceWidgets.length > 0 && (
          <div className="px-3 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Voice Output</p>
              <button onClick={onClearWidgets} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">{t("voice.clearWidgets")}</button>
            </div>
            <AnimatePresence>
              {voiceWidgets.slice(-6).map((w) => {
                const Comp = WIDGET_COMPONENTS[w.component];
                if (!Comp) return null;
                return (
                  <motion.div key={w.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-2 rounded-xl border overflow-hidden shadow-sm"
                    style={{ borderColor: "#e8eaf0" }}
                  >
                    <Comp {...w.props} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {voiceWidgets.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full pb-8 text-center px-4">
            <p className="text-2xl mb-2">🎙️</p>
            <p className="text-xs text-gray-400">{t("voice.noWidgets")}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t" style={{ borderColor: "#f3f4f6" }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-gray-400">Deepgram · GPT-4o-mini · Kokoro</span>
        </div>
      </div>
    </aside>
  );
}
