"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TaskCard } from "./pikaui/TaskCard";
import { KanbanBoard } from "./pikaui/KanbanBoard";
import { SprintAnalytics } from "./pikaui/SprintAnalytics";
import { TeamWorkload } from "./pikaui/TeamWorkload";
import { ProjectList } from "./pikaui/ProjectList";
import { StatusBanner } from "./pikaui/StatusBanner";
import { RiskPanel } from "./pikaui/RiskPanel";
import { RagResult } from "./pikaui/RagResult";

interface ComponentItem {
  id: string;
  component: string;
  props: Record<string, unknown>;
}
interface GenerativePanelProps {
  components: ComponentItem[];
  onClear: () => void;
}

const COMPONENT_MAP: Record<string, React.ComponentType<Record<string, unknown>>> = {
  TaskCard:       TaskCard       as unknown as React.ComponentType<Record<string, unknown>>,
  KanbanBoard:    KanbanBoard    as unknown as React.ComponentType<Record<string, unknown>>,
  SprintAnalytics: SprintAnalytics as unknown as React.ComponentType<Record<string, unknown>>,
  TeamWorkload:   TeamWorkload   as unknown as React.ComponentType<Record<string, unknown>>,
  ProjectList:    ProjectList    as unknown as React.ComponentType<Record<string, unknown>>,
  StatusBanner:   StatusBanner   as unknown as React.ComponentType<Record<string, unknown>>,
  RiskPanel:     RiskPanel     as unknown as React.ComponentType<Record<string, unknown>>,
  RagResult:     RagResult     as unknown as React.ComponentType<Record<string, unknown>>,
};

export function GenerativePanel({ components, onClear }: GenerativePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && components.length > 0) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [components.length]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }} />
          <h2 className="text-sm font-semibold text-gray-700">Live Workspace</h2>
          {components.length > 0 && (
            <span className="ml-1 text-xs bg-purple-100 text-purple-600 font-medium px-2 py-0.5 rounded-full">
              {components.length}
            </span>
          )}
        </div>
        {components.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Widgets area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {components.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 min-h-[400px]">
            {/* Illustration */}
            <div className="w-20 h-20 rounded-2xl mb-6 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6c5ce715, #0984e315)" }}>
              <svg className="w-10 h-10" style={{ color: "#6c5ce7" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-2">Your workspace is ready</h3>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              Speak a command and your project data will appear here as interactive widgets.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 text-left w-full max-w-xs">
              {[
                { icon: "🗂️", text: "Show all projects" },
                { icon: "📋", text: "Show the Kanban board" },
                { icon: "➕", text: "Create a task for Sara" },
                { icon: "📊", text: "Show sprint analytics" },
              ].map((h) => (
                <div key={h.text} className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border text-xs text-gray-500" style={{ borderColor: "var(--border)" }}>
                  <span>{h.icon}</span>
                  <span>&ldquo;{h.text}&rdquo;</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {components.map((item, index) => {
              const Component = COMPONENT_MAP[item.component];
              if (!Component) return null;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, delay: index === components.length - 1 ? 0 : 0, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="rounded-2xl bg-white border shadow-sm overflow-hidden" style={{ borderColor: "var(--border)" }}>
                    <Component {...item.props} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
