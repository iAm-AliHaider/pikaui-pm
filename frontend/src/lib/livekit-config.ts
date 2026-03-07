export function getLiveKitUrl(): string {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL || "";
}

export async function fetchToken(roomName: string, participantName: string): Promise<{ token: string; serverUrl: string }> {
  const response = await fetch("/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ roomName, participantName }),
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch token");
  }
  
  return response.json();
}
