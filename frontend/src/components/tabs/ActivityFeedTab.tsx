"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ActivityEntry } from "@/lib/types";

interface ActivityFeedTabProps {
  projectId: string;
  projectName: string;
}

type FilterType = "all" | "tasks" | "time" | "milestones";

const ACTION_LABELS: Record<string, string> = {
  created: "created",
  updated: "updated",
  status_changed: "moved",
  hours_logged: "logged time on",
  commented: "commented on",
  milestone_added: "added milestone",
  sprint_created: "created sprint",
};

const ACTION_ICONS: Record<string, string> = {
  task: "✅",
  timelog: "⏱",
  milestone: "🏁",
  sprint: "🚀",
  project: "📁",
};

const AVATAR_COLORS = [
  "#6c5ce7",
  "#0984e3",
  "#00b894",
  "#e84393",
  "#fdcb6e",
  "#e17055",
  "#00cec9",
  "#a29bfe",
];

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) {
    const hours = date.getHours();
    const mins = date.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    const h = hours % 12 || 12;
    const m = mins.toString().padStart(2, "0");
    return `yesterday ${h}:${m}${ampm}`;
  }
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDate(entries: ActivityEntry[]): Record<string, ActivityEntry[]> {
  const groups: Record<string, ActivityEntry[]> = {};
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const entry of entries) {
    const entryDate = new Date(entry.created_at).toDateString();
    let label: string;

    if (entryDate === today) {
      label = "Today";
    } else if (entryDate === yesterday.toDateString()) {
      label = "Yesterday";
    } else {
      label = new Date(entry.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(entry);
  }

  return groups;
}

export function ActivityFeedTab({ projectId, projectName }: ActivityFeedTabProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/activity?projectId=${projectId}&days=14&limit=50`);
      const data = await res.json();
      setEntries(data || []);
    } catch (e) {
      console.error("Failed to fetch activity:", e);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [projectId]);

  const filteredEntries = entries.filter((entry) => {
    if (filter === "all") return true;
    if (filter === "tasks") return entry.entity_type === "task";
    if (filter === "time") return entry.action === "hours_logged";
    if (filter === "milestones") return entry.entity_type === "milestone" || entry.action === "milestone_added" || entry.action === "sprint_created";
    return true;
  });

  const groupedEntries = groupByDate(filteredEntries);
  const dateLabels = ["Today", "Yesterday", ...Object.keys(groupedEntries).filter((k) => k !== "Today" && k !== "Yesterday").sort((a, b) => {
    const dateA = new Date(a + " " + new Date().getFullYear());
    const dateB = new Date(b + " " + new Date().getFullYear());
    return dateB.getTime() - dateA.getTime();
  })];

  const getAvatarColor = (name?: string): string => {
    if (!name) return AVATAR_COLORS[0];
    const index = name.charCodeAt(0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  };

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Activity Feed</h2>
            <p className="text-sm text-gray-500">{projectName}</p>
          </div>
          <button
            onClick={fetchActivity}
            className="self-start sm:self-auto px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 transition-colors flex items-center gap-2"
            style={{ borderColor: "#e8eaf0" }}
          >
            🔄 Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            { key: "all", label: "All" },
            { key: "tasks", label: "Tasks" },
            { key: "time", label: "Time Logs" },
            { key: "milestones", label: "Milestones" },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filter === f.key
                  ? "text-white"
                  : "text-gray-600 bg-gray-100 hover:bg-gray-200"
              }`}
              style={filter === f.key ? { background: "linear-gradient(135deg,#6c5ce7,#0984e3)" } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-gray-50 animate-pulse"
              style={{ backgroundColor: "#f9fafb" }}
            />
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="text-5xl mb-4">📭</div>
          <p className="text-gray-500">No activity yet. Start working on tasks!</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {(dateLabels || []).map((dateLabel) => {
            const dayEntries = groupedEntries[dateLabel];
            if (!dayEntries || dayEntries.length === 0) return null;

            return (
              <div key={dateLabel}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {dateLabel}
                </h3>
                <div className="space-y-2">
                  {(dayEntries || []).map((entry) => {
                    const actionLabel = ACTION_LABELS[entry.action] || entry.action;
                    const entityIcon = ACTION_ICONS[entry.entity_type] || "📄";
                    const avatarColor = getAvatarColor(entry.user_name);
                    const meta = entry.meta as Record<string, unknown> | undefined;

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 p-3 rounded-xl border bg-white hover:shadow-sm transition-shadow"
                        style={{ borderColor: "#e8eaf0" }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: avatarColor }}
                        >
                          {(entry.user_name || "?").charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold text-gray-900">
                              {entry.user_name || "Unknown"}
                            </span>{" "}
                            {actionLabel}{" "}
                            <span className="font-semibold" style={{ color: "#6c5ce7" }}>
                              {entry.entity_name || entry.task_title || "Untitled"}
                            </span>
                          </p>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">
                              {getRelativeTime(entry.created_at)}
                            </span>

                            {entry.action === "hours_logged" && meta && typeof meta === 'object' && 'hours' in meta && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full"
                                style={{ background: "#fef3c7", color: "#d97706" }}
                              >
                                {String((meta as Record<string, unknown>).hours)}h logged
                              </span>
                            )}

                            {entry.action === "status_changed" && meta && typeof meta === 'object' && 'from' in meta && 'to' in meta && (
                              <span className="text-xs text-gray-500">
                                {String((meta as Record<string, unknown>).from)} → {String((meta as Record<string, unknown>).to)}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-lg flex-shrink-0">{entityIcon}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
