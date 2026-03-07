"use client";

import { ReactNode, useCallback, useEffect } from "react";
import { RoomEvent } from "livekit-client";
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import { getLiveKitUrl } from "@/lib/livekit-config";

interface PikAuiProviderProps {
  children: ReactNode;
  token: string;
  onVoiceEvent?: (event: { type: string; [k: string]: unknown }) => void;
}

export function PikAuiProvider({ children, token, onVoiceEvent }: PikAuiProviderProps) {
  return (
    <LiveKitRoom token={token} serverUrl={getLiveKitUrl()} connect={true} className="h-full w-full flex overflow-hidden">
      <RoomAudioRenderer />
      <DataChannelListener onVoiceEvent={onVoiceEvent} />
      {children}
    </LiveKitRoom>
  );
}

function DataChannelListener({ onVoiceEvent }: { onVoiceEvent?: (e: { type: string; [k: string]: unknown }) => void }) {
  const room = useRoomContext();

  const handleData = useCallback((payload: Uint8Array, _participant: unknown, _kind: unknown, topic?: string) => {
    if (topic !== "ui_sync") return;
    try {
      const msg = JSON.parse(new TextDecoder().decode(payload));
      onVoiceEvent?.(msg);
    } catch { /* ignore malformed */ }
  }, [onVoiceEvent]);

  useEffect(() => {
    if (!room) return;
    room.on(RoomEvent.DataReceived, handleData);
    return () => { room.off(RoomEvent.DataReceived, handleData); };
  }, [room, handleData]);

  return null;
}
