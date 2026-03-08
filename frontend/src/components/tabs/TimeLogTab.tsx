"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TeamMember, TimeLogEntry } from "@/lib/types";

interface TimeLogTabProps {
  projectId: string;
  projectName: string;
  team: TeamMember[];
}

export function TimeLogTab({ projectId, projectName, team }: TimeLogTabProps) {
  const [dateRange, setDateRange] = useState<7 | 14 | 30>(7);
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLog, setNewLog] = useState({
    task_name: "",
    user_id: "",
    hours: 1,
    log_date: new Date().toISOString().split("T")[0],
    note: "",
  });

  useEffect(() => {
    const fetchTimeLogs = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/timelogs?projectId=${projectId}&days=${dateRange}`);
        if (response.ok) {
          const data = await response.json();
          setTimeLogs(data);
        }
      } catch (error) {
        console.error("Failed to fetch time logs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeLogs();
  }, [projectId, dateRange]);

  const summaryStats = useMemo(() => {
    const totalHours = timeLogs.reduce((sum, log) => sum + log.hours, 0);
    const avgRate = 95;
    const totalCost = totalHours * avgRate;
    const contributors = new Set(timeLogs.map((log) => log.user_name)).size;
    const daysInRange = dateRange;
    const avgPerDay = totalHours / daysInRange;
    return { totalHours, totalCost, contributors, avgPerDay };
  }, [timeLogs, dateRange]);

  const groupedByDate = useMemo(() => {
    const grouped: Record<string, TimeLogEntry[]> = {};
    timeLogs.forEach((log) => {
      if (!grouped[log.log_date]) {
        grouped[log.log_date] = [];
      }
      grouped[log.log_date].push(log);
    });
    return Object.entries(grouped).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [timeLogs]);

  const weeklyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    timeLogs.forEach((log) => {
      if (!totals[log.user_name]) {
        totals[log.user_name] = 0;
      }
      totals[log.user_name] += log.hours;
    });
    return Object.entries(totals).map(([name, hours]) => ({ name, hours }));
  }, [timeLogs]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const handleAddLog = async () => {
    if (!newLog.task_name || !newLog.user_id || !newLog.hours) return;
    try {
      const response = await fetch("/api/timelogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newLog,
          project_id: projectId,
        }),
      });
      if (response.ok) {
        setNewLog({
          task_name: "",
          user_id: "",
          hours: 1,
          log_date: new Date().toISOString().split("T")[0],
          note: "",
        });
        setShowAddForm(false);
        const refreshResponse = await fetch(`/api/timelogs?projectId=${projectId}&days=${dateRange}`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setTimeLogs(data);
        }
      }
    } catch (error) {
      console.error("Failed to add time log:", error);
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
          <h2 className="text-xl font-bold text-gray-900">Time Logs</h2>
          <p className="text-sm text-gray-500">{projectName}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "#e8eaf0" }}>
            {([7, 14, 30] as const).map((days) => (
              <button
                key={days}
                onClick={() => setDateRange(days)}
                className={`text-xs px-3 py-2 font-medium transition-colors ${
                  dateRange === days ? "text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
                style={{
                  background: dateRange === days ? "linear-gradient(135deg,#6c5ce7,#0984e3)" : "transparent",
                }}
              >
                {days}d
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-sm px-4 py-2 rounded-lg text-white font-medium transition-colors"
            style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}
          >
            + Log Time
          </button>
        </div>
      </motion.div>

      {/* Add Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border p-5 shadow-sm"
          style={{ borderColor: "#e8eaf0" }}
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Add Time Log</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Task</label>
              <input
                type="text"
                value={newLog.task_name}
                onChange={(e) => setNewLog({ ...newLog, task_name: e.target.value })}
                placeholder="What did you work on?"
                className="w-full text-sm border rounded-lg px-3 py-2"
                style={{ borderColor: "#e8eaf0" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Team Member</label>
              <select
                value={newLog.user_id}
                onChange={(e) => setNewLog({ ...newLog, user_id: e.target.value })}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-white"
                style={{ borderColor: "#e8eaf0" }}
              >
                <option value="">Select member</option>
                {team.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hours</label>
              <input
                type="number"
                value={newLog.hours}
                onChange={(e) => setNewLog({ ...newLog, hours: parseFloat(e.target.value) || 0 })}
                step={0.5}
                min={0.5}
                max={24}
                className="w-full text-sm border rounded-lg px-3 py-2"
                style={{ borderColor: "#e8eaf0" }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={newLog.log_date}
                onChange={(e) => setNewLog({ ...newLog, log_date: e.target.value })}
                className="w-full text-sm border rounded-lg px-3 py-2"
                style={{ borderColor: "#e8eaf0" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Note (optional)</label>
              <input
                type="text"
                value={newLog.note}
                onChange={(e) => setNewLog({ ...newLog, note: e.target.value })}
                placeholder="Add a note..."
                className="w-full text-sm border rounded-lg px-3 py-2"
                style={{ borderColor: "#e8eaf0" }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddLog}
              className="text-sm px-4 py-2 rounded-lg text-white font-medium"
              style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}
            >
              Log Time
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

      {/* Summary Row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { label: "Total Hours", value: `${summaryStats.totalHours.toFixed(1)}h`, color: "#6c5ce7" },
          { label: "Total Cost", value: `$${summaryStats.totalCost.toLocaleString()}`, color: "#0984e3" },
          { label: "Contributors", value: summaryStats.contributors, color: "#10b981" },
          { label: "Avg/Day", value: `${summaryStats.avgPerDay.toFixed(1)}h`, color: "#f59e0b" },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl p-4 border shadow-sm"
            style={{ borderColor: "#e8eaf0" }}
          >
            <p className="text-xs font-medium text-gray-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Daily View */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border p-5 shadow-sm"
        style={{ borderColor: "#e8eaf0" }}
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Logs</h3>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : groupedByDate.length > 0 ? (
          <div className="space-y-6">
            {groupedByDate.map(([date, logs]) => {
              const dayTotal = logs.reduce((sum, log) => sum + log.hours, 0);
              return (
                <div key={date}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-gray-700">{formatDate(date)}</h4>
                    <span className="text-xs text-gray-500">{dayTotal.toFixed(1)}h</span>
                  </div>
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: log.avatar_color || "linear-gradient(135deg,#6c5ce7,#0984e3)" }}
                        >
                          {(log.user_name || "?")[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{log.task_title || "Untitled task"}</p>
                          {log.note && <p className="text-xs text-gray-500 truncate">{log.note}</p>}
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                          {log.hours}h
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No time logs for this period.</p>
        )}
      </motion.div>

      {/* Weekly Totals Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border p-5 shadow-sm"
        style={{ borderColor: "#e8eaf0" }}
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Hours by Team Member</h3>
        {weeklyTotals.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklyTotals} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e8eaf0",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`${value.toFixed(1)}h`, "Hours"]}
              />
              <Bar
                dataKey="hours"
                fill="url(#barGradient)"
                radius={[4, 4, 0, 0]}
              />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6c5ce7" />
                  <stop offset="100%" stopColor="#0984e3" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400">No data to display.</p>
        )}
      </motion.div>
    </div>
  );
}
