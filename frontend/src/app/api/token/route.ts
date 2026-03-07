import { NextRequest, NextResponse } from "next/server";
import { AccessToken, RoomServiceClient, AgentDispatchClient } from "livekit-server-sdk";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomName, participantName } = body;

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: "roomName and participantName are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Create token with room join + agent dispatch permissions
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

    // Create the room first via RoomService
    const httpUrl = livekitUrl.replace("wss://", "https://");
    const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);

    try {
      await roomService.createRoom({ name: roomName, emptyTimeout: 300, maxParticipants: 5 });
    } catch (e) {
      // Room may already exist, that's fine
      console.log("Room create:", e instanceof Error ? e.message : "ok");
    }

    // Dispatch the pikaui-pm agent to this room
    try {
      const agentDispatch = new AgentDispatchClient(httpUrl, apiKey, apiSecret);
      await agentDispatch.createDispatch(roomName, "pikaui-pm");
      console.log("Agent dispatched to room:", roomName);
    } catch (e) {
      console.error("Agent dispatch failed:", e instanceof Error ? e.message : e);
    }

    return NextResponse.json({ token, serverUrl: livekitUrl });
  } catch (error) {
    console.error("Error generating token:", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}
