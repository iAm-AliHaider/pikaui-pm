"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AnalyticsData, BudgetStat } from "@/lib/types";

interface AnalyticsTabProps {
  data: AnalyticsData;
  projectId: string;
  projectName: string;
}

export function AnalyticsTab({ data, projectId, projectName }: AnalyticsTabProps) {
  const projectColor = "#6c5ce7";

  const totalHoursThisWeek = useMemo(() => {
    return (data?.teamUtil || []).reduce((sum, member) => sum + (member.hours_this_week || 0), 0);
  }, [data?.teamUtil]);

  const budgetBurnPercent = useMemo(() => {
    if (!data?.budget || data.budget.length === 0) return 0;
    const pcts = data.budget.map((b) => b.budget_allocated > 0 ? ((b.cost_burned || 0) / b.budget_allocated) * 100 : 0);
    return pcts.length > 0 ? Math.max(...pcts) : 0;
  }, [data?.budget]);

  const onTrackMilestones = useMemo(() => {
    return (data?.milestones || []).filter((m) => m.health === "on_track").length;
  }, [data?.milestones]);

  const activeRisks = data?.risks?.length || 0;

  const burndownData = useMemo(() => {
    if (!data?.burndown || data.burndown.length === 0) return [];
    const last7 = data.burndown.slice(-7);
    const totalTasks = last7[0]?.remaining + last7[0]?.completed || 100;
    const days = last7.length;
    return last7.map((point, idx) => ({
      ...point,
      ideal: Math.round(totalTasks - (totalTasks / days) * idx),
    }));
  }, [data?.burndown]);

  const velocityData = useMemo(() => {
    return (data?.velocity || []).map((v) => ({
      name: v.name,
      completed: v.completed,
      total: v.total,
    }));
  }, [data?.velocity]);

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null || isNaN(value)) return 'SAR 0';
    return `SAR ${value.toLocaleString()}`;
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getEstimatedCompletion = (budget: BudgetStat) => {
    if (!budget.deadline || !budget.cost_burned || budget.budget_allocated === 0) return null;
    const rate = budget.cost_burned / budget.budget_allocated;
    if (!isFinite(rate) || rate === 0) return null;
    const deadline = new Date(budget.deadline);
    const estimated = new Date(deadline.getTime() / rate);
    if (!isFinite(estimated.getTime())) return null;
    return formatDate(estimated.toISOString());
  };

  const heatmapData = useMemo(() => {
    const teamMembers = [...new Set((data?.timeLogs || []).map((l) => l.user_name))];
    const last14Days: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last14Days.push(d.toISOString().split("T")[0]);
    }
    return { teamMembers, last14Days };
  }, [data?.timeLogs]);

  const getHeatmapCell = (user: string, date: string) => {
    const log = (data?.timeLogs || []).find(
      (l) => l.user_name === user && l.log_date === date
    );
    return log?.hours || 0;
  };

  const getHeatmapColor = (hours: number) => {
    if (hours === 0) return "#ffffff";
    if (hours < 2) return "#f3e8ff";
    if (hours < 4) return "#d8b4fe";
    if (hours < 6) return "#c084fc";
    return "#9333ea";
  };

  const getRiskIcon = (riskType: string) => {
    switch (riskType) {
      case "overdue":
        return "⚠️";
      case "overloaded":
        return "🔥";
      case "budget":
        return "💸";
      case "velocity":
        return "📉";
      default:
        return "⚠️";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "#ef4444";
      case "medium":
        return "#f59e0b";
      case "low":
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Section 1: Health Overview */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            title: "Hours This Week",
            value: `${totalHoursThisWeek.toFixed(1)}h`,
            subtitle: "Team logged",
            color: "#6c5ce7",
          },
          {
            title: "Budget Burn",
            value: `${budgetBurnPercent.toFixed(0)}%`,
            subtitle: "Highest across budgets",
            color: budgetBurnPercent > 80 ? "#ef4444" : budgetBurnPercent > 60 ? "#f59e0b" : "#10b981",
          },
          {
            title: "On-Track Milestones",
            value: onTrackMilestones,
            subtitle: `${data?.milestones?.length || 0} total`,
            color: "#10b981",
          },
          {
            title: "Active Risks",
            value: activeRisks,
            subtitle: "Requiring attention",
            color: activeRisks > 0 ? "#ef4444" : "#10b981",
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-5 shadow-sm border-l-4"
            style={{ borderLeftColor: stat.color, borderColor: "#e8eaf0" }}
          >
            <p className="text-xs font-medium text-gray-500 mb-1">{stat.title}</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
            <p className="text-xs text-gray-400">{stat.subtitle}</p>
          </div>
        ))}
      </motion.div>

      {/* Section 2 & 3: Burndown & Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Burndown Chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3 bg-white rounded-2xl p-5 shadow-sm border"
          style={{ borderColor: "#e8eaf0" }}
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Sprint Burndown</h3>
          <p className="text-xs text-gray-400 mb-4">Showing last 7 days</p>
          {burndownData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={burndownData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="log_date"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  }}
                />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e8eaf0",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelFormatter={(val) => new Date(val).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                <Line
                  type="monotone"
                  dataKey="remaining"
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#ef4444" }}
                  name="Remaining"
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#10b981" }}
                  name="Completed"
                />
                <Line
                  type="monotone"
                  dataKey="ideal"
                  stroke="#9ca3af"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  dot={false}
                  name="Ideal"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm">
              No burndown data available.
            </div>
          )}
        </motion.div>

        {/* Velocity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border"
          style={{ borderColor: "#e8eaf0" }}
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Team Velocity</h3>
          {velocityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={velocityData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e8eaf0",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="completed" fill="#6c5ce7" radius={[4, 4, 0, 0]} name="Completed" />
                <Bar dataKey="total" fill="#d1d5db" radius={[4, 4, 0, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm">
              No velocity data available.
            </div>
          )}
        </motion.div>
      </div>

      {/* Section 4: Budget Tracker */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-5 shadow-sm border"
        style={{ borderColor: "#e8eaf0" }}
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Budget Tracker</h3>
        {(data?.budget || []).length > 0 ? (
          <div className="space-y-4">
            {data.budget.map((budget) => {
              const burnPercent = budget.budget_allocated > 0 ? ((budget.cost_burned || 0) / budget.budget_allocated) * 100 : 0;
              const barColor = burnPercent > 80 ? "#ef4444" : burnPercent > 60 ? "#f59e0b" : "#10b981";
              const estimatedDate = getEstimatedCompletion(budget);
              return (
                <div key={budget.id} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.color }} />
                      <span className="text-sm font-medium text-gray-800">{budget.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      Due {formatDate(budget.deadline)}
                      {estimatedDate && ` · Est. completion: ${estimatedDate}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-gray-500">{formatCurrency(budget.cost_burned)}</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(burnPercent, 100)}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{formatCurrency(budget.budget_allocated)}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {burnPercent.toFixed(0)}% used · {budget.total_hours}h logged
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No budget data available.</p>
        )}
      </motion.div>

      {/* Section 5 & 6: Team Utilization & Time Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Team Utilization */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl p-5 shadow-sm border"
          style={{ borderColor: "#e8eaf0" }}
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Team Utilization</h3>
          {(data?.teamUtil || []).length > 0 ? (
            <div className="space-y-3">
              {data.teamUtil.map((member, idx) => {
                const utilPercent = (member.hours_this_week / 40) * 100;
                const isOver = member.hours_this_week > 40;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: member.avatar_color || "linear-gradient(135deg,#6c5ce7,#0984e3)" }}
                    >
                      {member.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-800 truncate">{member.name}</span>
                        <span className="text-xs text-gray-500">
                          {member.hours_this_week}h this week · ${member.hourly_rate}/h
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(utilPercent, 100)}%`,
                            backgroundColor: isOver ? "#ef4444" : "#6c5ce7",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No team utilization data.</p>
          )}
        </motion.div>

        {/* Time Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-5 shadow-sm border"
          style={{ borderColor: "#e8eaf0" }}
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Time Heatmap (14 days)</h3>
          {heatmapData.teamMembers.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                <div className="flex mb-2 ml-24">
                  {heatmapData.last14Days.map((date) => {
                    const d = new Date(date);
                    return (
                      <div
                        key={date}
                        className="flex-1 text-[8px] text-gray-400 text-center"
                        title={d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      >
                        {d.getDate()}
                      </div>
                    );
                  })}
                </div>
                {heatmapData.teamMembers.map((user) => (
                  <div key={user} className="flex items-center mb-1">
                    <div className="w-20 text-xs text-gray-600 truncate pr-2">{user}</div>
                    {heatmapData.last14Days.map((date) => {
                      const hours = getHeatmapCell(user, date);
                      const d = new Date(date);
                      return (
                        <div
                          key={date}
                          className="flex-1 h-5 mx-0.5 rounded"
                          style={{ backgroundColor: getHeatmapColor(hours) }}
                          title={`${user} · ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${hours}h`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No time log data available.</p>
          )}
        </motion.div>
      </div>

      {/* Section 7: Risk Panel */}
      {(data?.risks?.length || 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl p-5 shadow-sm border"
          style={{ borderColor: "#e8eaf0" }}
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Active Risks</h3>
          <div className="space-y-3">
            {data.risks.map((risk, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
              >
                <span
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: getSeverityColor(risk.severity) }}
                />
                <span className="text-sm">{getRiskIcon(risk.risk_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{risk.title}</p>
                  {risk.detail && <p className="text-xs text-gray-500 mt-0.5">{risk.detail}</p>}
                </div>
                <button className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-200 transition-colors">
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
