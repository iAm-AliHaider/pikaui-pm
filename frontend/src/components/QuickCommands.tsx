"use client";

import { motion } from "framer-motion";

interface QuickCommandsProps {
  onCommand: (text: string) => void;
  isConnected: boolean;
}

interface Command {
  emoji: string;
  label: string;
  voiceText: string;
}

const COMMAND_GROUPS: { title: string; commands: Command[] }[] = [
  {
    title: "Projects",
    commands: [
      { emoji: "📋", label: "List projects", voiceText: "Show me all projects" },
      { emoji: "📊", label: "Analytics", voiceText: "Show full analytics" },
      { emoji: "📈", label: "Standup", voiceText: "Daily standup" },
      { emoji: "⚠️", label: "Detect risks", voiceText: "Detect risks" },
    ],
  },
  {
    title: "Board",
    commands: [
      { emoji: "▦", label: "Show board", voiceText: "Show the board" },
      { emoji: "✅", label: "Done tasks", voiceText: "Show done tasks" },
      { emoji: "🔴", label: "High priority", voiceText: "Search high priority tasks" },
      { emoji: "🔍", label: "Search tasks", voiceText: "Search in progress tasks" },
    ],
  },
  {
    title: "Team",
    commands: [
      { emoji: "👥", label: "Workload", voiceText: "Show team workload" },
      { emoji: "🏆", label: "Top performer", voiceText: "Who has the most done tasks?" },
      { emoji: "👤", label: "Assign", voiceText: "Who should I assign the next task to?" },
      { emoji: "⏱", label: "Log time", voiceText: "Log 2 hours on the current task" },
    ],
  },
  {
    title: "Insights",
    commands: [
      { emoji: "🏁", label: "Milestones", voiceText: "Show milestones" },
      { emoji: "💰", label: "Budget", voiceText: "Show analytics" },
      { emoji: "📄", label: "Search docs", voiceText: "Search docs for deployment guide" },
      { emoji: "🗓", label: "Sprint status", voiceText: "Show sprint analytics" },
      { emoji: "➕", label: "New task", voiceText: "Create a new high priority task" },
      { emoji: "📝", label: "New sprint", voiceText: "Create sprint" },
      { emoji: "🔎", label: "Activity", voiceText: "Show recent activity" },
      { emoji: "💡", label: "Suggest", voiceText: "Suggest who to assign the next task to" },
    ],
  },
];

export function QuickCommands({ onCommand, isConnected }: QuickCommandsProps) {
  const allCommands = COMMAND_GROUPS.flatMap((g) => g.commands);

  return (
    <div className="px-4 py-3 border-b" style={{ borderColor: "#f3f4f6" }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Quick Commands
      </p>
      <div className="grid grid-cols-2 gap-2">
        {(allCommands || []).map((cmd) => (
          <motion.button
            key={cmd.voiceText}
            onClick={() => onCommand(cmd.voiceText)}
            disabled={!isConnected}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs text-gray-600 transition-all ${
              !isConnected ? "opacity-40 cursor-not-allowed" : "hover:shadow hover:border-purple-300 hover:text-purple-600"
            }`}
            style={{ borderColor: "#e8eaf0" }}
          >
            <span className="text-sm">{cmd.emoji}</span>
            <span className="truncate">{cmd.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
