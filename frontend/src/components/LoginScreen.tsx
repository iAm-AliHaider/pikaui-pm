"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "./UserContext";

interface UserListItem {
  id: string;
  name: string;
  role: string;
  system_role: string;
  department: string;
  avatar_color: string;
}

const ROLE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  admin:   { bg: "#fef2f2", color: "#dc2626", label: "Admin" },
  manager: { bg: "#eff6ff", color: "#2563eb", label: "Manager" },
  member:  { bg: "#f0fdf4", color: "#16a34a", label: "Member" },
};

export function LoginScreen() {
  const { login } = useUser();
  const [users, setUsers]           = useState<UserListItem[]>([]);
  const [selected, setSelected]     = useState<UserListItem | null>(null);
  const [pin, setPin]               = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [shake, setShake]           = useState(false);

  useEffect(() => {
    fetch("/api/users").then(r => r.json()).then(setUsers).catch(() => {});
  }, []);

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === 4) attemptLogin(next);
  };

  const attemptLogin = async (p: string) => {
    if (!selected) return;
    setLoading(true);
    const result = await login(selected.id, p);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setShake(true);
      setTimeout(() => { setShake(false); setPin(""); }, 600);
    }
  };

  const PAD = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4" style={{ background: "#f0f2f7" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold shadow-lg"
            style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}>
            P
          </div>
          <h1 className="text-2xl font-bold text-gray-900">pikAui PM</h1>
          <p className="text-sm text-gray-500 mt-1">Voice-first project management</p>
        </div>

        <AnimatePresence mode="wait">
          {!selected ? (
            // User picker
            <motion.div key="picker" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="bg-white rounded-3xl shadow-sm border p-6 space-y-3" style={{ borderColor:"#e8eaf0" }}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Select your account</p>
              {users.map(u => {
                const badge = ROLE_BADGE[u.system_role] || ROLE_BADGE.member;
                return (
                  <button key={u.id} onClick={() => setSelected(u)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors text-left group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ background: u.avatar_color || "#6c5ce7" }}>
                      {u.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.role} · {u.department}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          ) : (
            // PIN pad
            <motion.div key="pin" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}
              className="bg-white rounded-3xl shadow-sm border p-6" style={{ borderColor:"#e8eaf0" }}>

              {/* Back + selected user */}
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => { setSelected(null); setPin(""); setError(""); }}
                  className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                  ←
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: selected.avatar_color }}>
                    {selected.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 leading-none">{selected.name}</p>
                    <p className="text-xs text-gray-400">{selected.role}</p>
                  </div>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 mb-5">Enter your 4-digit PIN</p>

              {/* PIN dots */}
              <motion.div animate={shake ? { x: [-8,8,-8,8,0] } : { x:0 }}
                transition={{ duration: 0.4 }}
                className="flex justify-center gap-4 mb-6">
                {[0,1,2,3].map(i => (
                  <div key={i} className="w-3 h-3 rounded-full border-2 transition-all"
                    style={{
                      borderColor: error ? "#ef4444" : "#6c5ce7",
                      background: i < pin.length ? (error ? "#ef4444" : "#6c5ce7") : "transparent",
                    }} />
                ))}
              </motion.div>

              {error && (
                <p className="text-center text-xs text-red-500 mb-4">{error}</p>
              )}

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2">
                {PAD.map((d, i) => (
                  <button key={i}
                    onClick={() => {
                      if (d === "⌫") { setPin(p => p.slice(0,-1)); setError(""); }
                      else if (d) handleDigit(d);
                    }}
                    disabled={loading || (!d && d !== "0")}
                    className="h-14 rounded-2xl text-lg font-semibold transition-all active:scale-95"
                    style={{
                      background: d === "⌫" ? "#fef2f2" : d ? "#f9fafb" : "transparent",
                      color: d === "⌫" ? "#ef4444" : "#111827",
                      border: d ? "1.5px solid #e8eaf0" : "none",
                    }}
                  >
                    {loading && d === "0" ? (
                      <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
                    ) : d}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-gray-400 mt-4">
          Admin PIN: 0000 · Member PIN: 1234
        </p>
      </motion.div>
    </div>
  );
}
