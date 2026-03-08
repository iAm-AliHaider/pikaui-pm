"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { RoomEvent, ConnectionState } from "livekit-client";
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import { getLiveKitUrl } from "@/lib/livekit-config";
import { FloatingVoiceButton } from "./FloatingVoiceButton";

interface PikAuiProviderProps {
  children: ReactNode;
  token: string;
  onVoiceEvent?: (event: { type: string; [k: string]: unknown }) => void;
  activeTab?: string;
  activeProjectId?: string | null;
  activeProjectName?: string;
  lastToast?: string | null;
}

export function PikAuiProvider({
  children, token, onVoiceEvent,
  activeTab, activeProjectId, activeProjectName, lastToast,
}: PikAuiProviderProps) {
  return (
    <LiveKitRoom
      token={token ?? ""}
      serverUrl={getLiveKitUrl()}
      connect={!!(token)}
      className="h-full w-full flex overflow-hidden"
    >
      <RoomAudioRenderer />
      <DataChannelListener onVoiceEvent={onVoiceEvent} />
      <ContextSender
        activeTab={activeTab}
        activeProjectId={activeProjectId}
        activeProjectName={activeProjectName}
      />
      <FloatingVoiceButton
        activeProjectName={activeProjectName}
        activeTab={activeTab}
        lastToast={lastToast}
      />
      {children}
    </LiveKitRoom>
  );
}

// ── Data channel receiver ─────────────────────────────────────────────────────
function DataChannelListener({
  onVoiceEvent,
}: {
  onVoiceEvent?: (e: { type: string; [k: string]: unknown }) => void;
}) {
  const room = useRoomContext();
  const onVoiceEventRef = useRef(onVoiceEvent);
  useEffect(() => { onVoiceEventRef.current = onVoiceEvent; }, [onVoiceEvent]);

  const handleData = useCallback(
    (payload: Uint8Array, _p: unknown, _k: unknown, topic?: string) => {
      // Log every data packet for debugging (topic + first 80 chars)
      const raw = new TextDecoder().decode(payload);
      console.log("[DataChannel] received | topic:", topic, "| data:", raw.slice(0, 80));

      if (topic !== "ui_sync") return;

      try {
        const msg = JSON.parse(raw) as { type: string; [k: string]: unknown };
        console.log("[DataChannel] dispatching event:", msg.type, msg);
        onVoiceEventRef.current?.(msg);
      } catch (e) {
        console.warn("[DataChannel] JSON parse error:", e, "raw:", raw);
      }
    },
    [],
  );

  useEffect(() => {
    if (!room) return;
    console.log("[DataChannel] registering listener on room:", room.name);
    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      console.log("[DataChannel] removing listener");
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, handleData]);

  // Debug badge — shows last received event type in bottom-left corner
  const [lastEvent, setLastEvent] = useState<string>("");
  useEffect(() => {
    if (!room) return;
    const dbg = (payload: Uint8Array, _p: unknown, _k: unknown, topic?: string) => {
      if (topic === "ui_sync") {
        try {
          const m = JSON.parse(new TextDecoder().decode(payload)) as { type: string };
          setLastEvent(m.type);
          // Clear after 3 seconds
          setTimeout(() => setLastEvent(""), 3000);
        } catch { /* ignore */ }
      }
    };
    room.on(RoomEvent.DataReceived, dbg);
    return () => { room.off(RoomEvent.DataReceived, dbg); };
  }, [room]);

  if (!lastEvent) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 112,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#7c3aed",
        color: "#fff",
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 99,
        zIndex: 9999,
        pointerEvents: "none",
        letterSpacing: "0.03em",
        opacity: 0.92,
      }}
    >
      {lastEvent}
    </div>
  );
}

// ── Context sync sender — tells agent what tab + project user is on ─────────
function ContextSender({
  activeTab,
  activeProjectId,
  activeProjectName,
}: {
  activeTab?: string;
  activeProjectId?: string | null;
  activeProjectName?: string;
}) {
  const room = useRoomContext();

  const contextRef = useRef({ activeTab, activeProjectId, activeProjectName });
  useEffect(() => {
    contextRef.current = { activeTab, activeProjectId, activeProjectName };
  }, [activeTab, activeProjectId, activeProjectName]);

  const sendContext = useCallback(() => {
    if (!room?.localParticipant) return;
    if (room.state !== ConnectionState.Connected) return;
    try {
      const payload = new TextEncoder().encode(
        JSON.stringify({
          activeTab:         contextRef.current.activeTab         ?? "overview",
          activeProjectId:   contextRef.current.activeProjectId   ?? null,
          activeProjectName: contextRef.current.activeProjectName ?? "",
        }),
      );
      room.localParticipant.publishData(payload, { topic: "context_sync", reliable: true });
      console.log("[ContextSender] sent:", contextRef.current);
    } catch (e) {
      console.warn("[ContextSender] send failed:", e);
    }
  }, [room]);

  // Send on room connect + when already connected on mount
  useEffect(() => {
    if (!room) return;
    const onConnected = () => { setTimeout(sendContext, 800); };
    room.on(RoomEvent.Connected, onConnected);
    if (room.state === ConnectionState.Connected) { setTimeout(sendContext, 400); }
    return () => { room.off(RoomEvent.Connected, onConnected); };
  }, [room, sendContext]);

  // Send on every tab/project change
  useEffect(() => { sendContext(); }, [sendContext, activeTab, activeProjectId, activeProjectName]);

  return null;
}
