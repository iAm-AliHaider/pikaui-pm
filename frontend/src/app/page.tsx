"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PikAuiProvider }  from "@/components/PikAuiProvider";
import { Dashboard }       from "@/components/Dashboard";
import { LanguageToggle, useLocale } from "@/components/LocaleContext";
import { fetchToken }      from "@/lib/livekit-config";
import { DashboardData, Task, AnalyticsData } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/components/UserContext";
import { LoginScreen } from "@/components/LoginScreen";
import DataTableWidget from "@/components/DataTableWidget";

const ANALYTICS_TABS = new Set(["analytics", "milestones", "timelog", "summary"]);

export default function Home() {
  const { currentUser, logout } = useUser();
  const { locale, t }           = useLocale();
  const [token, setToken]       = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData]         = useState<DashboardData | null>(null);
  const [analyticsData, setAnalyticsData]         = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading]   = useState(false);
  const [activeTab, setActiveTab]                 = useState("overview");
  const [activeProjectId, setActiveProjectId]     = useState<string | null>(null);
  const [selectedTask, setSelectedTask]           = useState<Task | null>(null);
  const [voiceSessionActive, setVoiceSessionActive] = useState(false);
  const [lastToast, setLastToast]                 = useState<string | null>(null);
  const [roomName] = useState(() => `pikAui-pm-${Date.now()}`);
  const [activeDataTable, setActiveDataTable] = useState<{
    title: string;
    columns: string[];
    rows: unknown[][];
    rowCount: number;
  } | null>(null);

  const refreshAnalyticsRef = useRef<() => void>(() => {});
  const activeProjectIdRef  = useRef<string | null>(null);
  activeProjectIdRef.current = activeProjectId;

  // ── Active project name (derived) ─────────────────────────────────────────
  const activeProject = data?.projects.find(p => p.id === activeProjectId) ?? data?.projects?.[0] ?? null;

  // ── Fetch dashboard data ───────────────────────────────────────────────────
  const fetchData = useCallback(async (forceProjectId?: string) => {
    try {
      const res = await fetch(`/api/data?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setData(d);
        setActiveProjectId(prev => {
          if (forceProjectId) return forceProjectId;
          if (!prev && d.projects?.length) return d.projects[0].id;
          return prev;
        });
      }
    } catch (e) { console.error("Data fetch:", e); }
  }, []);

  // ── Fetch analytics ────────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async (projectId?: string | null) => {
    setAnalyticsLoading(true);
    try {
      const pid = projectId ?? activeProjectIdRef.current;
      const url = pid
        ? `/api/analytics?projectId=${pid}&_t=${Date.now()}`
        : `/api/analytics?_t=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) setAnalyticsData(await res.json());
    } catch (e) { console.error("Analytics fetch:", e); }
    finally { setAnalyticsLoading(false); }
  }, []);

  refreshAnalyticsRef.current = () => fetchAnalytics();

  useEffect(() => { fetchData(); }, []);

  // ── 4s polling while voice session active ─────────────────────────────────
  useEffect(() => {
    if (!voiceSessionActive) return;
    const id = setInterval(() => {
      fetchData(activeProjectIdRef.current ?? undefined);
    }, 4000);
    return () => clearInterval(id);
  }, [voiceSessionActive, fetchData]);

  // ── Tab switching ──────────────────────────────────────────────────────────
  const handleSetActiveTab = useCallback((tab: string) => {
    setActiveTab(tab);
    if (ANALYTICS_TABS.has(tab) && !analyticsData) fetchAnalytics();
  }, [analyticsData, fetchAnalytics]);

  useEffect(() => {
    if (activeProjectId && ANALYTICS_TABS.has(activeTab)) fetchAnalytics(activeProjectId);
  }, [activeProjectId]);

  // ── Token ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function getToken() {
      setIsLoading(true);
      try {
        const { token: tk } = await fetchToken(roomName, `user-${Date.now()}`, locale);
        if (!cancelled) {
          setToken(tk);
          setVoiceSessionActive(true);
        }
      } catch { console.error("Token error"); }
      finally { if (!cancelled) setIsLoading(false); }
    }
    getToken();
    return () => { cancelled = true; };
  }, [roomName, locale]);

  // ── Voice event handler ────────────────────────────────────────────────────
  const handleVoiceEvent = useCallback((event: { type: string; [k: string]: unknown }) => {
    const t = event.type;

    // Navigation events (primary path — agent sends these with retry logic)
    if (t === "switch_tab") {
      const tab = event.tab as string;
      setActiveTab(tab);
      // Also trigger analytics fetch when switching to data-heavy tabs
      if (ANALYTICS_TABS.has(tab)) {
        setTimeout(() => fetchAnalytics(activeProjectIdRef.current), 300);
      }
      return;
    }

    if (t === "switch_project") {
      const pid = (event.projectId as string)?.trim();
      if (pid) {
        activeProjectIdRef.current = pid;  // sync update so refresh events see new id
        setActiveProjectId(pid);
        setTimeout(() => fetchData(pid), 150);
      }
      return;
    }

    if (t === "refresh") {
      const section = event.section as string;
      if (section === "analytics") {
        setTimeout(() => refreshAnalyticsRef.current(), 400);
      } else {
        setTimeout(async () => {
          const res = await fetch(`/api/data?_t=${Date.now()}`, { cache: "no-store" });
          if (res.ok) {
            const d = await res.json();
            setData(d);
            setActiveProjectId(prev => prev ?? (d.projects?.[0]?.id ?? null));
          }
        }, 300);
      }
      return;
    }

    // Widget events (secondary path — used as fallback navigation trigger)
    if (t === "tambo_render") {
      const component = event.component as string;
      const props     = event.props as Record<string, unknown>;

      // TaskCard: switch to that project's board + refresh
      if (component === "TaskCard") {
        const task = props?.task as Record<string, unknown> | undefined;
        const pid  = task?.project_id as string | undefined;
        setActiveTab("board");
        if (pid) setActiveProjectId(pid);
        setTimeout(() => fetchData(pid ?? undefined), 300);
      }

      // StatusBanner: show as toast near the PTT button + refresh board
      if (component === "StatusBanner") {
        const msg = props?.message as string;
        if (msg) setLastToast(msg);
        setActiveTab("board");
        setTimeout(() => fetchData(activeProjectIdRef.current ?? undefined), 300);
      }

      // KanbanBoard — switch to board tab + refresh data
      if (component === "KanbanBoard") {
        setActiveTab("board");
        setTimeout(() => fetchData(activeProjectIdRef.current ?? undefined), 200);
      }

      // SprintAnalytics — switch to analytics tab + fetch analytics
      if (component === "SprintAnalytics") {
        setActiveTab("analytics");
        setTimeout(() => fetchAnalytics(activeProjectIdRef.current), 300);
      }

      // TeamWorkload — switch to team tab + refresh data
      if (component === "TeamWorkload") {
        setActiveTab("team");
        setTimeout(() => fetchData(activeProjectIdRef.current ?? undefined), 200);
      }

      // TimeLogSummary — switch to timelog tab + refresh data
      if (component === "TimeLogSummary") {
        setActiveTab("timelog");
        setTimeout(() => fetchData(activeProjectIdRef.current ?? undefined), 200);
      }

      // DataTable: show floating table widget above PTT button
      if (component === "DataTable") {
        setActiveDataTable({
          title:    (props?.title as string) || "Query Results",
          columns:  (props?.columns as string[]) || [],
          rows:     (props?.rows as unknown[][]) || [],
          rowCount: (props?.rowCount as number) || 0,
        });
      }
    }
  }, [fetchData, fetchAnalytics]);

  // Show login screen if no user is authenticated
  if (!currentUser) return <LoginScreen />;

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "#f8f9fc" }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-purple-100" />
            <div className="absolute inset-0 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-gray-400 tracking-widest uppercase font-medium">{t("app.loading")}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex overflow-hidden" style={{ background: "#f0f2f7" }}>
      <PikAuiProvider
        token={token}
        onVoiceEvent={handleVoiceEvent}
        activeTab={activeTab}
        activeProjectId={activeProjectId}
        activeProjectName={activeProject?.name ?? ""}
        lastToast={lastToast}
      >
        {/* Main dashboard — full width, no sidebar */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          {data ? (
            <Dashboard
              data={data}
              analyticsData={analyticsData}
              analyticsLoading={analyticsLoading}
              activeTab={activeTab}
              setActiveTab={handleSetActiveTab}
              activeProjectId={activeProjectId}
              setActiveProjectId={setActiveProjectId}
              selectedTask={selectedTask}
              setSelectedTask={setSelectedTask}
              onRefresh={fetchData}
              onRefreshAnalytics={() => fetchAnalytics()}
              onLogout={logout}
              languageToggle={<LanguageToggle />}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-400">{t("app.noData")}</p>
              </div>
            </div>
          )}
        </div>
        <AnimatePresence>
          {activeDataTable && (
            <DataTableWidget
              title={activeDataTable.title}
              columns={activeDataTable.columns}
              rows={activeDataTable.rows}
              rowCount={activeDataTable.rowCount}
              onDismiss={() => setActiveDataTable(null)}
            />
          )}
        </AnimatePresence>
      </PikAuiProvider>
    </div>
  );
}
