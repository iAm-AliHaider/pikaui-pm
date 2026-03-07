"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, ConnectionState, Track } from "livekit-client";
import { motion, AnimatePresence } from "framer-motion";

interface FloatingVoiceButtonProps {
  activeProjectName?: string;
  activeTab?: string;
  lastToast?: string | null;
}

type VoiceState = "connecting" | "idle" | "listening" | "user_speaking" | "agent_speaking";

const STATE_CFG: Record<VoiceState, { bg: string; border: string; accent: string; label: string }> = {
  connecting:     { bg: "#f9fafb", border: "#e5e7eb", accent: "#9ca3af", label: "Connecting..." },
  idle:           { bg: "#ffffff", border: "#ede9fe", accent: "#7c3aed", label: "Tap to speak"  },
  listening:      { bg: "#f0fdf4", border: "#86efac", accent: "#16a34a", label: "Listening"     },
  user_speaking:  { bg: "#eff6ff", border: "#93c5fd", accent: "#2563eb", label: "You"           },
  agent_speaking: { bg: "#faf5ff", border: "#c4b5fd", accent: "#7c3aed", label: "PlanBot"       },
};

export function FloatingVoiceButton({ activeProjectName, activeTab, lastToast }: FloatingVoiceButtonProps) {
  const room = useRoomContext();
  const [micEnabled, setMicEnabled]   = useState(false);
  const [voiceState, setVoiceState]   = useState<VoiceState>("connecting");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastText, setToastText]     = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Connection state ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!room) return;
    const update = () => {
      if (room.state !== ConnectionState.Connected) setVoiceState("connecting");
      else if (!micEnabled) setVoiceState("idle");
    };
    update();
    room.on(RoomEvent.ConnectionStateChanged, update);
    return () => { room.off(RoomEvent.ConnectionStateChanged, update); };
  }, [room, micEnabled]);

  // ── Speaking detection ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!room) return;
    const handler = (speakers: { identity: string }[]) => {
      if (room.state !== ConnectionState.Connected) return;
      const localId = room.localParticipant.identity;
      const agentSpeaking = speakers.some(p => p.identity !== localId);
      const userSpeaking  = speakers.some(p => p.identity === localId);
      if      (agentSpeaking) setVoiceState("agent_speaking");
      else if (userSpeaking)  setVoiceState("user_speaking");
      else                    setVoiceState(micEnabled ? "listening" : "idle");
    };
    room.on(RoomEvent.ActiveSpeakersChanged, handler);
    return () => { room.off(RoomEvent.ActiveSpeakersChanged, handler); };
  }, [room, micEnabled]);

  // ── Toast display ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!lastToast) return;
    setToastText(lastToast);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 5000);
  }, [lastToast]);

  // ── Mic toggle ─────────────────────────────────────────────────────────────
  const toggleMic = useCallback(async () => {
    if (!room || room.state !== ConnectionState.Connected) return;
    const next = !micEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicEnabled(next);
      setVoiceState(next ? "listening" : "idle");
    } catch (e) {
      console.error("Mic toggle error:", e);
    }
  }, [room, micEnabled]);

  const cfg = STATE_CFG[voiceState];
  const isConnected = room?.state === ConnectionState.Connected;
  const isPulsing = voiceState === "listening" || voiceState === "agent_speaking" || voiceState === "user_speaking";

  return (
    <div className="fixed bottom-6 inset-x-0 flex flex-col items-center gap-3 z-50 pointer-events-none">
      {/* ── Toast bubble ────────────────────────────────── */}
      <AnimatePresence>
        {toastVisible && toastText && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto max-w-sm text-center text-sm text-gray-700 bg-white rounded-2xl px-4 py-2.5 shadow-md"
            style={{ border: "1.5px solid #f0f0f0" }}
          >
            {toastText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main PTT button ─────────────────────────────── */}
      <motion.button
        onClick={isConnected ? toggleMic : undefined}
        whileTap={{ scale: 0.94 }}
        className="pointer-events-auto relative flex items-center gap-3 rounded-full shadow-xl transition-colors"
        style={{
          background: cfg.bg,
          border: `2px solid ${cfg.border}`,
          padding: "10px 20px 10px 14px",
          minWidth: "230px",
          cursor: isConnected ? "pointer" : "default",
        }}
      >
        {/* Pulse ring */}
        {isPulsing && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${cfg.accent}` }}
            animate={{ opacity: [0.6, 0], scale: [1, 1.18] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}

        {/* Icon circle */}
        <div
          className="relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: cfg.accent + "15" }}
        >
          {voiceState === "connecting" && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
          )}
          {(voiceState === "idle") && (
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke={cfg.accent} strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4z" />
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19 10a7 7 0 01-14 0M12 19v4M8 23h8" />
            </svg>
          )}
          {(voiceState === "listening" || voiceState === "user_speaking") && (
            <svg className="w-4.5 h-4.5" fill={cfg.accent} viewBox="0 0 24 24">
              <rect x="1"  y="9"  width="3" height="8"  rx="1.5" opacity="0.5" />
              <rect x="6"  y="5"  width="3" height="16" rx="1.5" />
              <rect x="11" y="7"  width="3" height="12" rx="1.5" />
              <rect x="16" y="3"  width="3" height="18" rx="1.5" />
              <rect x="21" y="9"  width="3" height="8"  rx="1.5" opacity="0.5" />
            </svg>
          )}
          {voiceState === "agent_speaking" && (
            <svg className="w-4.5 h-4.5" fill={cfg.accent} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4" />
              <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"
                stroke={cfg.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold leading-none mb-0.5" style={{ color: cfg.accent }}>
            {cfg.label}
          </p>
          {activeProjectName && isConnected && (
            <p className="text-xs text-gray-400 truncate" style={{ maxWidth: "150px" }}>
              {activeProjectName}
              {activeTab ? ` · ${activeTab}` : ""}
            </p>
          )}
        </div>

        {/* Mic toggle dot */}
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ background: micEnabled ? cfg.accent + "20" : "#f3f4f6" }}
        >
          <div
            className="w-2 h-2 rounded-full transition-colors"
            style={{ background: micEnabled ? cfg.accent : "#d1d5db" }}
          />
        </div>
      </motion.button>
    </div>
  );
}
