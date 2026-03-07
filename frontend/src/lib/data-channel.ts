export interface TamboRenderMessage {
  type: "tambo_render";
  component: string;
  props: Record<string, unknown>;
}

export type UiSyncCallback = (component: string, props: Record<string, unknown>) => void;

export function createDataChannelHandler(onComponent: UiSyncCallback) {
  return (payload: Uint8Array, participant: unknown, kind: unknown, topic?: string) => {
    // Accept all kinds — don't filter by kind, only by topic
    if (topic !== "ui_sync") return;

    try {
      const text = new TextDecoder().decode(payload);
      console.log("[pikAui] Data received:", text);
      const msg = JSON.parse(text);

      if (msg.type === "tambo_render" && msg.component && msg.props) {
        console.log("[pikAui] Rendering:", msg.component);
        onComponent(msg.component, msg.props);
      }
    } catch (error) {
      console.error("[pikAui] Failed to parse data channel message:", error);
    }
  };
}
