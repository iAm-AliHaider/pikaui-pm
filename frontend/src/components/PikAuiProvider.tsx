"use client";

import { ReactNode, useCallback, useEffect, useRef } from "react";
import { RoomEvent } from "livekit-client";
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import { getLiveKitUrl } from "@/lib/livekit-config";
import { FloatingVoiceButton } from "./FloatingVoiceButton";

interface PikAuiProviderProps {
  children: ReactNode;
  token: string;
  onVoiceEvent?: (event: { type: string; [k: string]: unknown }) => void;
  // Screen context — sent to agent so it knows what user is looking at
  activeTab?: string;
  activeProjectId?: string | null;
  activeProjectName?: string;
  // Toast shown near the floating button
  lastToast?: string | null;
}

export function PikAuiProvider({
  children, token, onVoiceEvent,
  activeTab, activeProjectId, activeProjectName, lastToast,
}: PikAuiProviderProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={getLiveKitUrl()}
      connect={true}
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
function DataChannelListener({ onVoiceEvent }: { onVoiceEvent?: (e: { type: string; [k: string]: unknown }) => void }) {
  const room = useRoomContext();
  const onVoiceEventRef = useRef(onVoiceEvent);
  useEffect(() => { onVoiceEventRef.current = onVoiceEvent; }, [onVoiceEvent]);

  const handleData = useCallback((payload: Uint8Array, _p: unknown, _k: unknown, topic?: string) => {
    if (topic !== "ui_sync") return;
    try {
      const msg = JSON.parse(new TextDecoder().decode(payload));
      onVoiceEventRef.current?.(msg);
    } catch { /* ignore malformed */ }
  }, []);

  useEffect(() => {
    if (!room) return;
    room.on(RoomEvent.DataReceived, handleData);
    return () => { room.off(RoomEvent.DataReceived, handleData); };
  }, [room, handleData]);

  return null;
}

// ── Context sync sender — tells agent what user is looking at ─────────────────
function ContextSender({ activeTab, activeProjectId, activeProjectName }: {
  activeTab?: string;
  activeProjectId?: string | null;
  activeProjectName?: string;
}) {
  const room = useRoomContext();

  useEffect(() => {
    if (!room?.localParticipant) return;
    try {
      const payload = new TextEncoder().encode(JSON.stringify({
        activeTab:         activeTab ?? "overview",
        activeProjectId:   activeProjectId ?? null,
        activeProjectName: activeProjectName ?? "",
      }));
      room.localParticipant.publishData(payload, { topic: "context_sync", reliable: true });
    } catch { /* room not ready yet */ }
  }, [room, activeTab, activeProjectId, activeProjectName]);

  return null;
}
