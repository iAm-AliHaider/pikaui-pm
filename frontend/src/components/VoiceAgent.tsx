"use client";

import { useState, useEffect, useMemo } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { motion, AnimatePresence } from "framer-motion";

export function VoiceAgent() {
  const room = useRoomContext();
  const localParticipant = useLocalParticipant();
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [micError, setMicError] = useState("");
  const barHeights = useMemo(() => [10, 18, 12, 22, 8, 20, 14], []);

  useEffect(() => {
    if (!room) return;
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    room.on(RoomEvent.Connected, onConnect);
    room.on(RoomEvent.Disconnected, onDisconnect);
    if (room.state === "connected") setIsConnected(true);
    return () => { room.off(RoomEvent.Connected, onConnect); room.off(RoomEvent.Disconnected, onDisconnect); };
  }, [room]);

  useEffect(() => {
    setIsMicEnabled(localParticipant?.isMicrophoneEnabled ?? false);
  }, [localParticipant?.isMicrophoneEnabled]);

  const toggleMic = async () => {
    if (!localParticipant?.localParticipant) return;
    if (!navigator?.mediaDevices?.getUserMedia) { setMicError("Mic requires HTTPS"); return; }
    try {
      setMicError("");
      const next = !isMicEnabled;
      await localParticipant.localParticipant.setMicrophoneEnabled(next);
      setIsMicEnabled(next);
    } catch { setMicError("Mic access denied"); }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Orb */}
      <div className="relative flex items-center justify-center">
        {/* Pulse rings */}
        <AnimatePresence>
          {isMicEnabled && (
            <>
              <motion.div
                key="ring1"
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                className="absolute w-20 h-20 rounded-full"
                style={{ background: "radial-gradient(circle, #6c5ce720, transparent)" }}
              />
              <motion.div
                key="ring2"
                initial={{ scale: 1, opacity: 0.3 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
                className="absolute w-20 h-20 rounded-full"
                style={{ background: "radial-gradient(circle, #0984e320, transparent)" }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Main button */}
        <motion.button
          onClick={toggleMic}
          disabled={!isConnected}
          whileTap={{ scale: 0.93 }}
          className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 focus:outline-none"
          style={{
            background: isMicEnabled
              ? "linear-gradient(135deg, #6c5ce7, #0984e3)"
              : "white",
            border: isMicEnabled ? "none" : "2px solid #e8eaf0",
            boxShadow: isMicEnabled
              ? "0 8px 32px rgba(108, 92, 231, 0.35)"
              : "0 2px 12px rgba(0,0,0,0.08)",
            opacity: isConnected ? 1 : 0.5,
            cursor: isConnected ? "pointer" : "not-allowed",
          }}
        >
          <svg
            className="w-8 h-8"
            style={{ color: isMicEnabled ? "white" : "#9ca3af" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </motion.button>
      </div>

      {/* Audio waveform bars */}
      <AnimatePresence>
        {isMicEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-end gap-[3px] h-7"
          >
            {barHeights.map((h, i) => (
              <motion.div
                key={i}
                className="w-1 rounded-full"
                style={{ background: "linear-gradient(to top, #6c5ce7, #0984e3)" }}
                animate={{ height: [h, h * 1.8, h] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full transition-colors duration-300"
            style={{ background: isConnected ? "#10b981" : "#d1d5db" }}
          />
          <span className="text-sm font-medium text-gray-600">
            {!isConnected ? "Connecting..." : isMicEnabled ? "Listening..." : "Tap to speak"}
          </span>
        </div>
        {micError && <p className="text-xs text-red-500">{micError}</p>}
      </div>
    </div>
  );
}
