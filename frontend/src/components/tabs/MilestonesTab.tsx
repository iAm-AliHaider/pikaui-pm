"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Milestone } from "@/lib/types";

interface MilestonesTabProps {
  milestones: Milestone[];
  projectId: string;
  projectName: string;
  onRefresh: () => void;
}

export function MilestonesTab({ milestones, projectId, projectName, onRefresh }: MilestonesTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    name: "",
    due_date: "",
    description: "",
  });
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "achieved" | "missed">("all");

  const filteredMilestones = milestones.filter((m) => {
    if (statusFilter === "all") return true;
    return m.status === statusFilter;
  });

  const sortedMilestones = [...filteredMilestones].sort((a, b) => {
    if (!a.due_date || !b.due_date) return 0;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  const nextMilestone = sortedMilestones.find((m) => m.status === "pending" && m.due_date);
  const daysUntilNext = nextMilestone?.due_date
    ? Math.ceil((new Date(nextMilestone.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const getHealthColor = (health: string) => {
    switch (health) {
      case "on_track":
        return "#10b981";
      case "soon":
        return "#f59e0b";
      case "overdue":
        return "#ef4444";
      default:
        return "#3b82f6";
    }
  };

  const getStatusDotColor = (milestone: Milestone) => {
    if (milestone.status === "achieved") return "#14b8a6";
    if (milestone.health === "on_track") return "#10b981";
    if (milestone.health === "overdue") return "#ef4444";
    if (milestone.health === "soon") return "#f59e0b";
    return "#3b82f6";
  };

  const getHealthBadge = (health: string, status: string) => {
    if (status === "achieved") return { text: "Achieved", color: "#14b8a6", bg: "#f0fdfa" };
    if (health === "on_track") return { text: "On Track", color: "#10b981", bg: "#ecfdf5" };
    if (health === "soon") return { text: "Due Soon", color: "#f59e0b", bg: "#fffbeb" };
    if (health === "overdue") return { text: "Overdue", color: "#ef4444", bg: "#fef2f2" };
    return { text: "On Track", color: "#3b82f6", bg: "#eff6ff" };
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const handleAddMilestone = async () => {
    if (!newMilestone.name || !newMilestone.due_date) return;
    try {
      const response = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newMilestone,
          project_id: projectId,
        }),
      });
      if (response.ok) {
        setNewMilestone({ name: "", due_date: "", description: "" });
        setShowAddForm(false);
        onRefresh();
      }
    } catch (error) {
      console.error("Failed to add milestone:", error);
    }
  };

  const handleStatusChange = async (milestoneId: string, newStatus: "pending" | "achieved" | "missed") => {
    try {
      const response = await fetch(`/api/milestones`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: milestoneId,
          status: newStatus,
        }),
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error("Failed to update milestone:", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-xl font-bold text-gray-900">Milestones</h2>
          <p className="text-sm text-gray-500">{projectName}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="text-sm border rounded-lg px-3 py-2 bg-white"
            style={{ borderColor: "#e8eaf0" }}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="achieved">Achieved</option>
            <option value="missed">Missed</option>
          </select>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-sm px-4 py-2 rounded-lg text-white font-medium transition-colors"
            style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}
          >
            + Add Milestone
          </button>
        </div>
      </motion.div>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl border p-5 shadow-sm overflow-hidden"
            style={{ borderColor: "#e8eaf0" }}
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-4">New Milestone</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={newMilestone.name}
                  onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
                  placeholder="Milestone name"
                  className="w-full text-sm border rounded-lg px-3 py-2"
                  style={{ borderColor: "#e8eaf0" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newMilestone.due_date}
                  onChange={(e) => setNewMilestone({ ...newMilestone, due_date: e.target.value })}
                  className="w-full text-sm border rounded-lg px-3 py-2"
                  style={{ borderColor: "#e8eaf0" }}
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
              <textarea
                value={newMilestone.description}
                onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                placeholder="Describe this milestone..."
                rows={2}
                className="w-full text-sm border rounded-lg px-3 py-2 resize-none"
                style={{ borderColor: "#e8eaf0" }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddMilestone}
                className="text-sm px-4 py-2 rounded-lg text-white font-medium"
                style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}
              >
                Create
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-sm px-4 py-2 rounded-lg border font-medium text-gray-600"
                style={{ borderColor: "#e8eaf0" }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline View */}
      {sortedMilestones.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {sortedMilestones.map((milestone, idx) => {
              const healthBadge = getHealthBadge(milestone.health, milestone.status);
              const progress = milestone.total_tasks > 0 ? (milestone.done_tasks / milestone.total_tasks) * 100 : 0;
              return (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative pl-12"
                >
                  {/* Timeline dot */}
                  <div
                    className="absolute left-2.5 top-5 w-3 h-3 rounded-full border-2 border-white"
                    style={{ backgroundColor: getStatusDotColor(milestone) }}
                  />

                  {/* Card */}
                  <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: "#e8eaf0" }}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Status indicator */}
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">{milestone.name}</h4>
                          <p className="text-xs text-gray-500 mb-2">
                            Due {formatDate(milestone.due_date)} · {milestone.done_tasks}/{milestone.total_tasks} tasks
                          </p>
                          {milestone.description && (
                            <p className="text-xs text-gray-600 mb-3">{milestone.description}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: healthBadge.bg, color: healthBadge.color }}
                            >
                              {healthBadge.text}
                            </span>
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${progress}%`, background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400">{progress.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Status dropdown */}
                      <select
                        value={milestone.status}
                        onChange={(e) => handleStatusChange(milestone.id, e.target.value as typeof milestone.status)}
                        className="text-xs border rounded-lg px-3 py-1.5 bg-white"
                        style={{ borderColor: "#e8eaf0" }}
                      >
                        <option value="pending">Pending</option>
                        <option value="achieved">Achieved</option>
                        <option value="missed">Missed</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border p-8 text-center" style={{ borderColor: "#e8eaf0" }}>
          <p className="text-sm text-gray-400">No milestones yet. Add one to get started!</p>
        </div>
      )}

      {/* Countdown */}
      {nextMilestone && daysUntilNext !== null && daysUntilNext >= 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border p-4 shadow-sm text-center"
          style={{ borderColor: "#e8eaf0" }}
        >
          <p className="text-sm text-gray-600">
            🏁 Next milestone: <span className="font-semibold">{nextMilestone.name}</span> in{" "}
            <span className="font-bold" style={{ color: daysUntilNext <= 3 ? "#ef4444" : "#6c5ce7" }}>
              {daysUntilNext === 0 ? "today!" : `${daysUntilNext} days`}
            </span>
          </p>
        </motion.div>
      )}
    </div>
  );
}
