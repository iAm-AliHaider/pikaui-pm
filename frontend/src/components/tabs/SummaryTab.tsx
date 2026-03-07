"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Project, VelocityPoint, BudgetStat } from "@/lib/types";

interface DashboardData {
  projects: Project[];
  tasks: unknown[];
  team: unknown[];
  documents: unknown[];
  sprints: unknown[];
}

interface AnalyticsData {
  burndown: unknown[];
  velocity: VelocityPoint[];
  timeLogs: unknown[];
  budget: BudgetStat[];
  teamUtil: unknown[];
  milestones: unknown[];
  risks: unknown[];
}

function calculateHealthScore(
  project: Project,
  budgetStat?: BudgetStat,
  velocityPoints?: VelocityPoint[]
): number {
  const totalTasks = Number(project.total_tasks) || 1;
  const doneTasks = Number(project.done_tasks) || 0;
  const completionPct = (doneTasks / totalTasks) * 100;

  const tasks = (project as unknown as { tasks?: unknown[] }).tasks || [];
  const now = new Date();
  const overdueTasks = (tasks as { due_date?: string; status?: string }[]).filter(
    (t) => t.due_date && new Date(t.due_date) < now && t.status !== "done"
  ).length;
  const overdueRatio = overdueTasks / totalTasks;

  const budgetPct = budgetStat
    ? (Number(budgetStat.cost_burned) / Math.max(Number(budgetStat.budget_allocated), 1)) * 100
    : 0;

  const latestSprint = velocityPoints?.[0];
  const sprintVelocityScore = latestSprint
    ? (Number(latestSprint.completed) / Math.max(Number(latestSprint.total), 1)) * 100
    : 75;

  const score =
    completionPct * 0.3 +
    (1 - overdueRatio) * 100 * 0.3 +
    (1 - budgetPct / 100) * 100 * 0.2 +
    sprintVelocityScore * 0.2;

  return Math.max(0, Math.min(100, score));
}

function getGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "#10b981";
    case "B":
      return "#14b8a6";
    case "C":
      return "#eab308";
    case "D":
      return "#f97316";
    default:
      return "#ef4444";
  }
}

export function SummaryTab() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dashRes, analyticsRes] = await Promise.all([
          fetch("/api/data"),
          fetch("/api/analytics"),
        ]);
        const dash = await dashRes.json();
        const analy = await analyticsRes.json();
        setDashboardData(dash);
        setAnalyticsData(analy);
      } catch (e) {
        console.error("Failed to fetch data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-50 animate-pulse" style={{ backgroundColor: "#f9fafb" }} />
        ))}
      </div>
    );
  }

  const projects = dashboardData?.projects || [];
  const budgetStats = analyticsData?.budget || [];
  const velocityPoints = analyticsData?.velocity || [];

  const projectHealths = (projects || []).map((project) => {
    const budgetStat = budgetStats?.find((b) => b.name === project.name);
    const projectVelocity = velocityPoints?.filter(
      (v) => v.name && v.name.toLowerCase().includes(project.name.toLowerCase())
    );
    const healthScore = calculateHealthScore(project, budgetStat, projectVelocity);
    const grade = getGrade(healthScore);

    const totalTasks = Number(project.total_tasks) || 1;
    const doneTasks = Number(project.done_tasks) || 0;
    const completionPct = Math.round((doneTasks / totalTasks) * 100);

    const tasks = (project as unknown as { tasks?: unknown[] }).tasks || [];
    const now = new Date();
    const overdueTasks = (tasks as { due_date?: string; status?: string }[]).filter(
      (t) => t.due_date && new Date(t.due_date) < now && t.status !== "done"
    ).length;

    const budgetPct = budgetStat
      ? Math.round(
          (Number(budgetStat.cost_burned) /
            Math.max(Number(budgetStat.budget_allocated), 1)) *
            100
        )
      : 0;

    const hoursThisWeek = Number(budgetStat?.total_hours || 0) / 4;

    return {
      ...project,
      health_score: healthScore,
      grade,
      completion_pct: completionPct,
      overdue_tasks: overdueTasks,
      budget_pct: budgetPct,
      hours_this_week: hoursThisWeek,
    };
  });

  const velocityByProject: Record<string, { name: string; data: { sprint: string; completed: number }[] }> = {};

  (velocityPoints || []).forEach((v) => {
    const projectName = v.name?.split(" - ")[0] || "Unknown";
    if (!velocityByProject[projectName]) {
      velocityByProject[projectName] = { name: projectName, data: [] };
    }
    velocityByProject[projectName].data.push({
      sprint: v.name || "Sprint",
      completed: Number(v.completed) || 0,
    });
  });

  const velocityChartData = Object.values(velocityByProject).map((p) => ({
    name: p.name,
    data: p.data.reverse(),
  }));

  const teamUtil = analyticsData?.teamUtil || [];

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Cross-Project Summary</h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {(projectHealths || []).map((project) => {
          const gradeColor = getGradeColor(project.grade);
          const healthData = [{ name: "Health", value: project.health_score, fill: gradeColor }];

          return (
            <div
              key={project.id}
              className="bg-white rounded-2xl border p-5 shadow-sm overflow-hidden"
              style={{ borderColor: "#e8eaf0" }}
            >
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-1 h-12 rounded-full"
                  style={{ background: project.color }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                      style={{ background: project.color + "18", color: project.color }}
                    >
                      {project.status}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold" style={{ color: gradeColor }}>
                      {Math.round(project.health_score)}
                    </span>
                    <span
                      className="text-lg font-bold"
                      style={{ color: gradeColor }}
                    >
                      {project.grade}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-20 mb-4">
                <ResponsiveContainer width="100%" height={80}>
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="100%"
                    data={healthData}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar
                      background={{ fill: "#f3f4f6" }}
                      dataKey="value"
                      cornerRadius={10}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="text-center p-1.5 rounded bg-gray-50">
                  <div className="text-gray-400">Completion</div>
                  <div className="font-semibold text-gray-700">{project.completion_pct}%</div>
                </div>
                <div className="text-center p-1.5 rounded bg-gray-50">
                  <div className="text-gray-400">Overdue</div>
                  <div className="font-semibold" style={{ color: project.overdue_tasks > 0 ? "#ef4444" : "#10b981" }}>
                    {project.overdue_tasks}
                  </div>
                </div>
                <div className="text-center p-1.5 rounded bg-gray-50">
                  <div className="text-gray-400">Budget</div>
                  <div className="font-semibold" style={{ color: project.budget_pct > 80 ? "#ef4444" : "#10b981" }}>
                    {project.budget_pct}%
                  </div>
                </div>
                <div className="text-center p-1.5 rounded bg-gray-50">
                  <div className="text-gray-400">Hours/wk</div>
                  <div className="font-semibold text-gray-700">{project.hours_this_week.toFixed(0)}h</div>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border p-5 shadow-sm"
        style={{ borderColor: "#e8eaf0" }}
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Project Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "#e8eaf0" }}>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Project</th>
                <th className="text-center py-2 px-3 font-medium text-gray-500">Tasks</th>
                <th className="text-center py-2 px-3 font-medium text-gray-500">Done</th>
                <th className="text-center py-2 px-3 font-medium text-gray-500">Overdue</th>
                <th className="text-center py-2 px-3 font-medium text-gray-500">Budget</th>
                <th className="text-center py-2 px-3 font-medium text-gray-500">Hours/wk</th>
                <th className="text-center py-2 px-3 font-medium text-gray-500">Deadline</th>
                <th className="text-center py-2 px-3 font-medium text-gray-500">Health</th>
              </tr>
            </thead>
            <tbody>
              {(projectHealths || []).map((project) => (
                <tr key={project.id} className="border-b hover:bg-gray-50" style={{ borderColor: "#f3f4f6" }}>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: project.color }} />
                      <span className="font-medium text-gray-800">{project.name}</span>
                    </div>
                  </td>
                  <td className="text-center py-2 px-3 text-gray-600">{project.total_tasks}</td>
                  <td className="text-center py-2 px-3 text-gray-600">{project.done_tasks}</td>
                  <td className="text-center py-2 px-3" style={{ color: project.overdue_tasks > 0 ? "#ef4444" : "#10b981" }}>
                    {project.overdue_tasks}
                  </td>
                  <td className="text-center py-2 px-3" style={{ color: project.budget_pct > 80 ? "#ef4444" : "#10b981" }}>
                    {project.budget_pct}%
                  </td>
                  <td className="text-center py-2 px-3 text-gray-600">{project.hours_this_week.toFixed(0)}h</td>
                  <td className="text-center py-2 px-3 text-gray-600">
                    {project.deadline ? new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td className="text-center py-2 px-3">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: getGradeColor(project.grade) + "20", color: getGradeColor(project.grade) }}
                    >
                      {project.grade} ({Math.round(project.health_score)})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border p-5 shadow-sm"
        style={{ borderColor: "#e8eaf0" }}
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Velocity Trend</h3>
        {(velocityChartData || []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No velocity data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={(velocityChartData[0]?.data || []).map((d, i) => ({ ...d, index: i }))}>
              <XAxis dataKey="sprint" tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e8eaf0" }}
                labelStyle={{ fontSize: 12, color: "#374151" }}
              />
              {(velocityChartData || []).map((project, idx) => {
                const projectData = projects.find((p) => p.name === project.name);
                return (
                  <Line
                    key={project.name}
                    type="monotone"
                    dataKey="completed"
                    stroke={projectData?.color || "#6c5ce7"}
                    strokeWidth={2}
                    dot={{ fill: projectData?.color || "#6c5ce7", r: 3 }}
                    name={project.name}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border p-5 shadow-sm"
        style={{ borderColor: "#e8eaf0" }}
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Team Distribution</h3>
        {(teamUtil || []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No team data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={teamUtil as unknown as { name: string; hours: number }[]}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e8eaf0" }}
                labelStyle={{ fontSize: 12, color: "#374151" }}
              />
              <Legend />
              <Bar dataKey="hours_this_week" name="Hours/Week" fill="#6c5ce7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
}
