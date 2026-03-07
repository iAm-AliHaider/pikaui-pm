"use client";

import { ReactNode, useCallback, useEffect, useRef } from "react";
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

  // Store latest callback in a ref so the data channel listener
  // never needs to re-register when the callback identity changes.
  const onVoiceEventRef = useRef(onVoiceEvent);
  useEffect(() => { onVoiceEventRef.current = onVoiceEvent; }, [onVoiceEvent]);

  // Stable handler — registered once, reads latest callback via ref.
  const handleData = useCallback((payload: Uint8Array, _participant: unknown, _kind: unknown, topic?: string) => {
    if (topic !== "ui_sync") return;
    try {
      const msg = JSON.parse(new TextDecoder().decode(payload));
      onVoiceEventRef.current?.(msg);
    } catch { /* ignore malformed */ }
  }, []); // no deps — stable for lifetime of component

  useEffect(() => {
    if (!room) return;
    room.on(RoomEvent.DataReceived, handleData);
    return () => { room.off(RoomEvent.DataReceived, handleData); };
  }, [room, handleData]); // handleData is stable, re-registers only when room changes

  return null;
}
