"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CreateUserModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const SYSTEM_ROLES = [
  { value: "member",  label: "Member",  desc: "Track and update own tasks" },
  { value: "manager", label: "Manager", desc: "Manage projects and assign tasks" },
  { value: "admin",   label: "Admin",   desc: "Full access including delete" },
];

const DEPARTMENTS = ["Engineering", "Design", "Management", "Quality", "Marketing", "Finance", "Operations", "General"];

export function CreateUserModal({ onClose, onCreated }: CreateUserModalProps) {
  const [form, setForm] = useState({
    name: "", email: "", role: "", department: "Engineering",
    system_role: "member", pin: "1234", hourly_rate: 75,
  });
  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (form.pin.length !== 4 || !/^\d{4}$/.test(form.pin)) {
      setError("PIN must be exactly 4 digits");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Create failed"); return; }
      onCreated();
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          onClick={e => e.stopPropagation()}
          className="relative bg-white rounded-3xl shadow-xl border w-full max-w-md max-h-[90dvh] overflow-y-auto mx-4"
          style={{ borderColor: "#e8eaf0" }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Add Team Member</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Full Name *</label>
                <input value={form.name} onChange={e => set("name", e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  style={{ borderColor: "#e8eaf0" }} />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Email</label>
                <input value={form.email} onChange={e => set("email", e.target.value)}
                  placeholder="jane@company.com" type="email"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  style={{ borderColor: "#e8eaf0" }} />
              </div>

              {/* Job title */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Job Title</label>
                <input value={form.role} onChange={e => set("role", e.target.value)}
                  placeholder="Senior Developer"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  style={{ borderColor: "#e8eaf0" }} />
              </div>

              {/* Department */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Department</label>
                <select value={form.department} onChange={e => set("department", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  style={{ borderColor: "#e8eaf0" }}>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>

              {/* System role */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Access Level</label>
                <div className="space-y-2">
                  {SYSTEM_ROLES.map(r => (
                    <button key={r.value} onClick={() => set("system_role", r.value)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
                      style={{
                        borderColor: form.system_role === r.value ? "#6c5ce7" : "#e8eaf0",
                        background: form.system_role === r.value ? "#f5f3ff" : "white",
                      }}>
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: form.system_role === r.value ? "#6c5ce7" : "#d1d5db" }}>
                        {form.system_role === r.value && (
                          <div className="w-2 h-2 rounded-full" style={{ background: "#6c5ce7" }} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{r.label}</p>
                        <p className="text-xs text-gray-400">{r.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* PIN */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">4-Digit PIN</label>
                <input value={form.pin} onChange={e => set("pin", e.target.value.replace(/\D/g,"").slice(0,4))}
                  placeholder="1234" type="password" maxLength={4}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-200 tracking-widest"
                  style={{ borderColor: "#e8eaf0" }} />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: "#e8eaf0" }}>
                  Cancel
                </button>
                <button onClick={submit} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}>
                  {saving ? "Adding..." : "Add Member"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
