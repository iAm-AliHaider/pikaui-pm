import { NextRequest, NextResponse } from "next/server";
import { AccessToken, RoomServiceClient, AgentDispatchClient } from "livekit-server-sdk";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomName, participantName, lang = "en" } = body;

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: "roomName and participantName are required" },
        { status: 400 }
      );
    }

    const apiKey    = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Create participant token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
    });
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();

    const httpUrl = livekitUrl.replace("wss://", "https://");
    const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);

    // Create room
    try {
      await roomService.createRoom({ name: roomName, emptyTimeout: 300, maxParticipants: 5 });
    } catch (e) {
      console.log("Room create:", e instanceof Error ? e.message : "ok");
    }

    // Dispatch agent with language metadata
    try {
      const agentDispatch = new AgentDispatchClient(httpUrl, apiKey, apiSecret);
      const metadata = JSON.stringify({ lang: lang === "de" ? "de" : "en" });
      await agentDispatch.createDispatch(roomName, "pikaui-pm", { metadata });
      console.log(`Agent dispatched to ${roomName} with lang=${lang}`);
    } catch (e) {
      console.error("Agent dispatch failed:", e instanceof Error ? e.message : e);
    }

    return NextResponse.json({ token, serverUrl: livekitUrl });
  } catch (error) {
    console.error("Error generating token:", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}
