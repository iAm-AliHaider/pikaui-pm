"use client";

import { motion } from "framer-motion";
import { Risk } from "@/lib/types";

interface RiskPanelProps {
  risks: Risk[];
  project?: string;
}

export function RiskPanel({ risks, project }: RiskPanelProps) {
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

  const displayRisks = risks.slice(0, 4);
  const remainingCount = risks.length - 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border p-4 shadow-sm"
      style={{ borderColor: "#e8eaf0" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Active Risks</h3>
        {project && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{project}</span>
        )}
      </div>

      {displayRisks.length > 0 ? (
        <div className="space-y-2">
          {displayRisks.map((risk, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-sm"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: getSeverityColor(risk.severity) }}
              />
              <span className="text-gray-700">{getRiskIcon(risk.risk_type)}</span>
              <span className="text-gray-800 truncate">{risk.title}</span>
            </div>
          ))}
          {remainingCount > 0 && (
            <p className="text-xs text-gray-500 pt-1">+ {remainingCount} more</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">No active risks.</p>
      )}

      <button className="w-full mt-3 text-xs text-center text-purple-600 hover:text-purple-800 font-medium transition-colors">
        Run full analysis →
      </button>
    </motion.div>
  );
}
