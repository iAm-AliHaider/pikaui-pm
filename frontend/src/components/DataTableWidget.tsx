"use client";

import { motion, AnimatePresence } from "framer-motion";

interface DataTableWidgetProps {
  title: string;
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  onDismiss: () => void;
}

export default function DataTableWidget({
  title,
  columns,
  rows,
  rowCount,
  onDismiss,
}: DataTableWidgetProps) {
  const showBadge = rowCount > rows.length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-2xl"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-violet-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-violet-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-violet-700">Query Results</span>
              {showBadge && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  Showing {rows.length} of {rowCount} rows
                </span>
              )}
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-4 py-2">
            <p className="text-sm text-gray-500 italic truncate">{title}</p>
          </div>

          <div className="max-h-60 overflow-y-auto thin-scrollbar">
            <table className="w-full">
              <thead className="sticky top-0">
                <tr>
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      className="text-xs font-semibold text-violet-700 uppercase bg-violet-50 px-3 py-2 text-left"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    {row.map((cell, cellIndex) => {
                      const displayValue = cell === null || cell === undefined ? "-" : String(cell);
                      const isNumeric = displayValue !== "-" && !isNaN(Number(displayValue));
                      
                      return (
                        <td
                          key={cellIndex}
                          className={`text-sm text-gray-700 px-3 py-1.5 ${isNumeric ? "text-right" : "text-left"}`}
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
