"use client";
import { motion } from "framer-motion";

interface StatusBannerProps {
  message: string;
  type?: "info" | "success" | "warning" | "error";
  progress?: number | null;
}

const TYPE_STYLES = {
  info:    { bg: "bg-blue-50",    border: "#bfdbfe", icon: "ℹ️", text: "text-blue-700",    bar: "#3b82f6" },
  success: { bg: "bg-emerald-50", border: "#a7f3d0", icon: "✅", text: "text-emerald-700", bar: "#10b981" },
  warning: { bg: "bg-amber-50",   border: "#fde68a", icon: "⚠️", text: "text-amber-700",   bar: "#f59e0b" },
  error:   { bg: "bg-red-50",     border: "#fecaca", icon: "❌", text: "text-red-700",      bar: "#ef4444" },
};

export function StatusBanner({ message, type = "info", progress }: StatusBannerProps) {
  const style = TYPE_STYLES[type] || TYPE_STYLES.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`p-4 ${style.bg} border rounded-xl`}
      style={{ borderColor: style.border }}
    >
      <div className="flex items-start gap-3">
        <span className="text-base mt-0.5 flex-shrink-0">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${style.text}`}>{message}</p>
          {typeof progress === "number" && progress >= 0 && (
            <div className="mt-2">
              <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: style.bar }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <p className="text-[10px] mt-1" style={{ color: style.bar }}>{progress}%</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
