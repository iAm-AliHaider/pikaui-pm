"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TeamMember } from "@/lib/types";
import { useLocale } from "../LocaleContext";

interface CreateProjectModalProps {
  team: TeamMember[];
  onClose: () => void;
  onCreated: () => void;
}

const COLORS = [
  "#6c5ce7",
  "#0984e3",
  "#00b894",
  "#fd79a8",
  "#fdcb6e",
  "#e17055",
  "#a29bfe",
  "#00cec9",
];

export function CreateProjectModal({
  team,
  onClose,
  onCreated,
}: CreateProjectModalProps) {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [color, setColor] = useState(COLORS[0]);
  const [managerName, setManagerName] = useState("");
  const [budget, setBudget] = useState<number | "">("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("createProject.required"));
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          status,
          color,
          manager_name: managerName || undefined,
          budget: budget ? Number(budget) : undefined,
          deadline: deadline || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create project");
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-2xl shadow-xl border w-full max-w-lg max-h-[85vh] overflow-y-auto mx-4"
        style={{ borderColor: "#e8eaf0" }}
      >
        <div className="sticky top-0 bg-white rounded-t-2xl border-b z-10 px-6 py-4 flex items-center justify-between" style={{ borderColor: "#e8eaf0" }}>
          <h2 className="text-lg font-bold text-gray-900">{t("createProject.title")}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">{t("createProject.name")} *</label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("createProject.placeholder")}
              className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300"
              style={{ borderColor: "#e8eaf0" }}
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">{t("createProject.desc")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("createProject.desc")}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-xl border resize-none focus:outline-none focus:border-purple-300"
              style={{ borderColor: "#e8eaf0" }}
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">{t("createProject.status")}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300"
              style={{ borderColor: "#e8eaf0" }}
            >
              <option value="active">{t("project.active")}</option>
              <option value="on_hold">{t("project.on_hold")}</option>
              <option value="completed">{t("project.completed")}</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">{t("createProject.color")}</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    color === c ? "ring-2 ring-offset-2 ring-purple-400 scale-110" : "hover:scale-105"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">{t("createProject.manager")}</label>
            <select
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300"
              style={{ borderColor: "#e8eaf0" }}
            >
              <option value="">{t("createProject.none")}</option>
              {team.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">{t("createProject.budget")}</label>
              <input
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300"
                style={{ borderColor: "#e8eaf0" }}
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">{t("createProject.deadline")}</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-purple-300"
                style={{ borderColor: "#e8eaf0" }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {t("createProject.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}
            >
              {saving ? t("createProject.saving") : t("createProject.save")}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
