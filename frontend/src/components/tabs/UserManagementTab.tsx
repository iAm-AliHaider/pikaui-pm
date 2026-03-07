"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useUser } from "../UserContext";
import { CreateUserModal } from "../modals/CreateUserModal";

interface UserRecord {
  id: string; name: string; role: string; system_role: string;
  department: string; email: string; avatar_color: string;
  hourly_rate: number; is_active: boolean; created_at: string;
}

const ROLE_CFG: Record<string, { bg: string; color: string; label: string }> = {
  admin:   { bg: "#fef2f2", color: "#dc2626", label: "Admin" },
  manager: { bg: "#eff6ff", color: "#2563eb", label: "Manager" },
  member:  { bg: "#f0fdf4", color: "#16a34a", label: "Member" },
};

export function UserManagementTab() {
  const { currentUser, isAdmin } = useUser();
  const [users, setUsers]             = useState<UserRecord[]>([]);
  const [showCreate, setShowCreate]   = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [busy, setBusy]               = useState<string | null>(null);

  const loadUsers = () => {
    fetch("/api/users").then(r => r.json()).then(setUsers).catch(() => {});
  };

  useEffect(() => { loadUsers(); }, []);

  const changeRole = async (userId: string, system_role: string) => {
    setBusy(userId);
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_role }),
    });
    await loadUsers();
    setEditingRole(null);
    setBusy(null);
  };

  const deactivate = async (userId: string) => {
    if (!confirm("Deactivate this user? They will no longer be able to log in.")) return;
    setBusy(userId);
    await fetch(`/api/users/${userId}`, { method: "DELETE" });
    await loadUsers();
    setBusy(null);
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-4xl mb-4">🔒</p>
        <p className="text-sm font-medium">Admin access required</p>
      </div>
    );
  }

  const adminCount   = users.filter(u => u.system_role === "admin").length;
  const managerCount = users.filter(u => u.system_role === "manager").length;
  const memberCount  = users.filter(u => u.system_role === "member").length;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Team Members</h2>
          <p className="text-xs text-gray-400">{users.length} active · {adminCount} admin · {managerCount} manager · {memberCount} member</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm"
          style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}>
          + Add Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Admins",   value: adminCount,   color: "#dc2626" },
          { label: "Managers", value: managerCount, color: "#2563eb" },
          { label: "Members",  value: memberCount,  color: "#16a34a" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border p-4 text-center shadow-sm" style={{ borderColor: "#e8eaf0" }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* User list */}
      <div className="space-y-3">
        {users.map((user, i) => {
          const cfg = ROLE_CFG[user.system_role] || ROLE_CFG.member;
          const isSelf = user.id === currentUser?.id;
          return (
            <motion.div key={user.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white rounded-2xl border shadow-sm"
              style={{ borderColor: "#e8eaf0" }}>
              <div className="p-4 flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: user.avatar_color || "#6c5ce7" }}>
                  {user.name[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">You</span>}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{user.role} · {user.department}</p>
                  {user.email && <p className="text-xs text-gray-300 truncate">{user.email}</p>}
                </div>

                {/* Role badge + change */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {editingRole === user.id ? (
                    <div className="flex gap-1">
                      {["member","manager","admin"].map(r => (
                        <button key={r} onClick={() => changeRole(user.id, r)}
                          disabled={busy === user.id}
                          className="text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all"
                          style={{
                            borderColor: ROLE_CFG[r].color + "60",
                            background: ROLE_CFG[r].bg,
                            color: ROLE_CFG[r].color,
                          }}>
                          {r}
                        </button>
                      ))}
                      <button onClick={() => setEditingRole(null)} className="text-[10px] text-gray-400 px-1">×</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => !isSelf && setEditingRole(user.id)}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color }}
                        title={isSelf ? "Cannot change own role" : "Click to change role"}>
                        {cfg.label}
                      </button>
                      {!isSelf && isAdmin && (
                        <button onClick={() => deactivate(user.id)}
                          disabled={busy === user.id}
                          className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors text-xs"
                          title="Deactivate user">
                          {busy === user.id ? "..." : "✕"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onCreated={loadUsers} />
      )}
    </div>
  );
}
