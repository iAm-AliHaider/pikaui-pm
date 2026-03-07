"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PikAuiProvider }  from "@/components/PikAuiProvider";
import { VoiceSidebar }    from "@/components/VoiceSidebar";
import { Dashboard }       from "@/components/Dashboard";
import { LanguageToggle, useLocale } from "@/components/LocaleContext";
import { fetchToken }      from "@/lib/livekit-config";
import { DashboardData, Task, AnalyticsData } from "@/lib/types";
import { motion } from "framer-motion";

const ANALYTICS_TABS = new Set(["analytics", "milestones", "timelog", "summary"]);

export default function Home() {
  const { locale, t }               = useLocale();
  const [token, setToken]           = useState("");
  const [isLoading, setIsLoading]   = useState(true);
  const [data, setData]             = useState<DashboardData | null>(null);
  const [analyticsData, setAnalyticsData]       = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [activeTab, setActiveTab]               = useState("overview");
  const [activeProjectId, setActiveProjectId]   = useState<string | null>(null);
  const [selectedTask, setSelectedTask]         = useState<Task | null>(null);
  const [voiceSessionActive, setVoiceSessionActive] = useState(false);
  const [voiceWidgets, setVoiceWidgets] = useState<{ id: string; component: string; props: Record<string, unknown> }[]>([]);
  const [roomName] = useState(() => `pikAui-pm-${Date.now()}`);

  // Refs so callbacks always close over latest values
  const refreshRef          = useRef<() => void>(() => {});
  const refreshAnalyticsRef = useRef<() => void>(() => {});
  const activeProjectIdRef  = useRef<string | null>(null);
  activeProjectIdRef.current = activeProjectId;

  // ── Fetch dashboard data ──────────────────────────────────────────────────
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

  // ── Fetch analytics data ──────────────────────────────────────────────────
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

  refreshRef.current          = () => fetchData();
  refreshAnalyticsRef.current = () => fetchAnalytics();

  useEffect(() => { fetchData(); }, []);

  // ── Auto-polling fallback (every 4s when voice session is active) ─────────
  // Guarantees the board updates even if data-channel events are dropped.
  useEffect(() => {
    if (!voiceSessionActive) return;
    const id = setInterval(() => {
      fetchData(activeProjectIdRef.current ?? undefined);
    }, 4000);
    return () => clearInterval(id);
  }, [voiceSessionActive, fetchData]);

  // ── Auto-fetch analytics when switching to analytics tabs ─────────────────
  const handleSetActiveTab = useCallback((tab: string) => {
    setActiveTab(tab);
    if (ANALYTICS_TABS.has(tab) && !analyticsData) fetchAnalytics();
  }, [analyticsData, fetchAnalytics]);

  // Re-fetch analytics when project changes on an analytics tab
  useEffect(() => {
    if (activeProjectId && ANALYTICS_TABS.has(activeTab)) {
      fetchAnalytics(activeProjectId);
    }
  }, [activeProjectId]);

  // ── Token — re-fetch whenever locale changes ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function getToken() {
      setIsLoading(true);
      try {
        const { token: tk } = await fetchToken(roomName, `user-${Date.now()}`, locale);
        if (!cancelled) {
          setToken(tk);
          setVoiceSessionActive(true); // mark session as active once token is ready
        }
      } catch { console.error("Token error"); }
      finally { if (!cancelled) setIsLoading(false); }
    }
    getToken();
    return () => { cancelled = true; };
  }, [roomName, locale]);

  // ── Voice event handler ───────────────────────────────────────────────────
  const handleVoiceEvent = useCallback((event: { type: string; [k: string]: unknown }) => {
    console.log("[pikAui] voice event:", event.type, event);

    if (event.type === "tambo_render") {
      const { component, props } = event as { type: string; component: string; props: Record<string, unknown> };
      setVoiceWidgets(w => [...w, { id: `w-${Date.now()}-${Math.random()}`, component, props }]);

      // Piggyback: TaskCard means a task was created → switch to that project's board
      if (component === "TaskCard") {
        const task = props.task as Record<string, unknown> | undefined;
        const pid  = task?.project_id as string | undefined;
        console.log("[pikAui] TaskCard received — switching to board, project:", pid);
        if (pid) setActiveProjectId(pid);
        setActiveTab("board");
        // Fetch fresh data to show the new task (slight delay for DB to settle)
        setTimeout(() => fetchData(pid ?? undefined), 300);
      }

      // Piggyback: StatusBanner after a status change → refresh board
      if (component === "StatusBanner") {
        setActiveTab("board");
        setTimeout(() => fetchData(activeProjectIdRef.current ?? undefined), 300);
      }

    } else if (event.type === "switch_tab") {
      const tab = event.tab as string;
      console.log("[pikAui] switch_tab:", tab);
      setActiveTab(tab);

    } else if (event.type === "switch_project") {
      const pid = (event.projectId as string)?.trim();
      console.log("[pikAui] switch_project:", pid);
      if (pid) {
        setActiveProjectId(pid);
        setTimeout(() => fetchData(pid), 150);
      }

    } else if (event.type === "refresh") {
      const section = event.section as string;
      console.log("[pikAui] refresh:", section);
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
        }, 350);
      }
    }
  }, [fetchData]);

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
      <PikAuiProvider token={token} onVoiceEvent={handleVoiceEvent}>
        <VoiceSidebar
          voiceWidgets={voiceWidgets}
          onClearWidgets={() => setVoiceWidgets([])}
        />
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
      </PikAuiProvider>
    </div>
  );
}
