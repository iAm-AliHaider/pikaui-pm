"use client";

import { motion } from "framer-motion";

interface RagResultProps {
  query: string;
  answer: string;
  projectName?: string;
  sourceCount?: number;
}

export function RagResult({ query, answer, projectName, sourceCount }: RagResultProps) {
  return (
    <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">🔍</span>
        <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">Doc Search</span>
        {projectName && <span className="text-[10px] text-gray-400">· {projectName}</span>}
      </div>
      <p className="text-xs text-gray-500 mb-2 italic">&ldquo;{query}&rdquo;</p>
      <p className="text-sm text-gray-800 leading-relaxed">{answer}</p>
      {sourceCount !== undefined && sourceCount > 0 && (
        <p className="text-[10px] text-gray-400 mt-2">Based on {sourceCount} document(s)</p>
      )}
    </motion.div>
  );
}
