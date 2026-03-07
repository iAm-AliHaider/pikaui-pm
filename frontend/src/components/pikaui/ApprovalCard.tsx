"use client";

interface ApprovalCardProps {
  title: string;
  description: string;
  amount?: number | null;
  status: "pending" | "approved" | "rejected";
  actions: string[];
}

const STATUS = {
  pending: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", label: "Pending" },
  approved: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "Approved" },
  rejected: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", label: "Rejected" },
};

export function ApprovalCard({ title, description, amount, status, actions }: ApprovalCardProps) {
  const s = STATUS[status] || STATUS.pending;
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}>{s.label}</span>
      </div>
      <p className="text-zinc-400 text-xs mb-3">{description}</p>
      {amount != null && amount > 0 && (
        <div className="text-2xl font-bold text-white mb-3">${amount.toLocaleString()}</div>
      )}
      {actions.length > 0 && status === "pending" && (
        <div className="flex gap-2">
          {actions.map((action: string, i: number) => (
            <button key={i} className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${
              i === 0
                ? "bg-purple-600 hover:bg-purple-500 text-white"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            }`}>
              {action}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
