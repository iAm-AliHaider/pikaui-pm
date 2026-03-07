"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Document } from "@/lib/types";
import { useLocale } from "../LocaleContext";

const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  doc:   { icon: "📄", color: "#3b82f6" },
  pdf:   { icon: "📕", color: "#ef4444" },
  sheet: { icon: "📊", color: "#10b981" },
  slide: { icon: "📽️", color: "#f59e0b" },
  image: { icon: "🖼️", color: "#8b5cf6" },
  other: { icon: "📎", color: "#6b7280" },
};

export function DocsTab({ documents, projectId, projectName, onRefresh }: {
  documents: Document[];
  projectId: string;
  projectName: string;
  onRefresh: () => void;
}) {
  const { t } = useLocale();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: "", file_url: "", file_type: "doc", description: "" });
  const [uploading, setUploading] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const filtered = searchQ
    ? documents.filter(d => d.name.toLowerCase().includes(searchQ.toLowerCase()) || d.description?.toLowerCase().includes(searchQ.toLowerCase()))
    : documents;

  const handleUpload = async () => {
    if (!uploadForm.name.trim()) return;
    setUploading(true);
    await fetch("/api/docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...uploadForm, project_id: projectId }),
    });
    setUploading(false);
    setShowUpload(false);
    setUploadForm({ name: "", file_url: "", file_type: "doc", description: "" });
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/docs?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-800">{t("docs.title")}</h3>
          <p className="text-xs text-gray-400">{projectName} — {documents.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder={t("docs.search")}
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="pl-8 pr-3 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:border-purple-300 w-48"
              style={{ borderColor: "#e8eaf0" }}
            />
            <span className="absolute left-2.5 top-2 text-gray-400 text-xs">🔍</span>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="px-3 py-2 text-xs font-medium text-white rounded-xl shadow-sm hover:shadow-md transition-all"
            style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}
          >
            {t("docs.upload")}
          </button>
        </div>
      </div>

      {/* Upload form */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: "#e8eaf0" }}>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">{t("docs.upload")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input placeholder="Document name *" value={uploadForm.name} onChange={e => setUploadForm({ ...uploadForm, name: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border focus:outline-none focus:border-purple-300" style={{ borderColor: "#e8eaf0" }} />
                <input placeholder="URL (Google Docs, Notion, etc.)" value={uploadForm.file_url} onChange={e => setUploadForm({ ...uploadForm, file_url: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border focus:outline-none focus:border-purple-300" style={{ borderColor: "#e8eaf0" }} />
                <select value={uploadForm.file_type} onChange={e => setUploadForm({ ...uploadForm, file_type: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border focus:outline-none focus:border-purple-300" style={{ borderColor: "#e8eaf0" }}>
                  <option value="doc">Document</option>
                  <option value="pdf">PDF</option>
                  <option value="sheet">Spreadsheet</option>
                  <option value="slide">Presentation</option>
                  <option value="image">Image</option>
                  <option value="other">Other</option>
                </select>
                <input placeholder="Description" value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border focus:outline-none focus:border-purple-300" style={{ borderColor: "#e8eaf0" }} />
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={handleUpload} disabled={uploading || !uploadForm.name.trim()}
                  className="px-4 py-2 text-xs font-medium text-white rounded-lg disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}>
                  {uploading ? "..." : t("docs.upload")}
                </button>
                <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700">{t("createTask.cancel")}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Documents grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl mb-3">📁</span>
          <p className="text-sm text-gray-500 font-medium">{t("docs.noDocs")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((doc, i) => {
            const fi = FILE_ICONS[doc.file_type] || FILE_ICONS.other;
            return (
              <motion.div key={doc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl border p-4 hover:shadow-md transition-all group"
                style={{ borderColor: "#e8eaf0" }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: fi.color + "15" }}>
                    {fi.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{doc.name}</p>
                    {doc.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{doc.description}</p>}
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                      <span className="capitalize">{doc.file_type}</span>
                      <span>·</span>
                      <span>{new Date(doc.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      {doc.qdrant_indexed && <span className="text-purple-500">· {t("docs.indexed")}</span>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener"
                      className="px-2.5 py-1 text-[10px] font-medium rounded-lg border hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-colors"
                      style={{ borderColor: "#e8eaf0", color: "#6b7280" }}>
                      Open ↗
                    </a>
                  )}
                  <button onClick={() => handleDelete(doc.id)}
                    className="px-2.5 py-1 text-[10px] font-medium rounded-lg border hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors text-gray-400"
                    style={{ borderColor: "#e8eaf0" }}>
                    Delete
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Voice tip */}
      <div className="mt-8 bg-purple-50 rounded-xl p-4 border border-purple-100">
        <p className="text-xs text-purple-700 font-medium">💡 Voice-powered document search</p>
        <p className="text-xs text-purple-500 mt-1">Say &ldquo;search docs for deployment guide&rdquo; to use AI-powered search across all project documents.</p>
      </div>
    </div>
  );
}
