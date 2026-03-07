# pikAui Build Instructions

Read ARCHITECTURE.md in the parent directory first for full context.

## What to Build

Build a Voice-Powered Generative UI app called "pikAui". The frontend uses Next.js + Tambo + LiveKit.

### 1. Create Tambo Generative Components in `src/components/pikaui/`:

**ProductCard.tsx** — Beautiful product display card with image, name, price, description, color badge, stock status. Use Tailwind for styling.

**FormStep.tsx** — Multi-step form that shows current step, total steps, and fields with their fill status. Animated transitions.

**ApprovalCard.tsx** — Card for approve/reject actions with title, description, optional amount, status badge, and action buttons.

**DataChart.tsx** — Simple chart component (use inline SVG bar/line chart since recharts isn't available). Shows title and data visualization.

**StatusBanner.tsx** — Notification banner with message, type (info/success/warning/error), and optional progress bar.

### 2. Create Component Registry in `src/lib/tambo-components.ts`:
Register all 5 components with Zod schemas for Tambo. Export the array of TamboComponent objects.

### 3. Create Data Channel Handler in `src/lib/data-channel.ts`:
- Listen for LiveKit data messages on topic "ui_sync"
- Parse JSON messages with type "tambo_render"
- Dispatch component + props to the UI

### 4. Create LiveKit Config in `src/lib/livekit-config.ts`:
- LiveKit server URL from env var NEXT_PUBLIC_LIVEKIT_URL
- Token fetching from /api/token endpoint

### 5. Create PikAuiProvider in `src/components/PikAuiProvider.tsx`:
- Wraps children in TamboProvider + LiveKitRoom
- Passes component registry to Tambo
- Handles LiveKit connection state

### 6. Create VoiceAgent in `src/components/VoiceAgent.tsx`:
- Microphone toggle button (big circular, animated)
- Audio visualizer showing voice activity
- Connection status indicator
- Uses @livekit/components-react hooks

### 7. Create GenerativePanel in `src/components/GenerativePanel.tsx`:
- Right-side panel that displays Tambo-rendered components
- Scrollable, shows components as they arrive via data channel
- Empty state with instructions

### 8. Update `src/app/page.tsx`:
- Split layout: left side = VoiceAgent (voice controls), right side = GenerativePanel (dynamic UI)
- Header with pikAui logo/name
- Dark theme, modern design
- Wrap in PikAuiProvider

### 9. Create `src/app/api/token/route.ts`:
- POST endpoint that generates LiveKit tokens
- Uses livekit-server-sdk (or manual JWT)
- Returns { token, serverUrl }

### 10. Update `src/app/layout.tsx`:
- Set metadata title to "pikAui - Voice-Powered Generative UI"
- Dark background, Inter font

### 11. Create `.env.local.example`:
```
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
NEXT_PUBLIC_TAMBO_API_KEY=your-tambo-api-key
```

## Design Guidelines
- Dark theme (#0a0a0a background, white text)
- Accent color: Electric purple (#8B5CF6) and cyan (#06B6D4)
- Glassmorphism cards (backdrop-blur, semi-transparent backgrounds)
- Smooth animations (framer-motion style with CSS transitions)
- Mobile responsive (voice on top, UI panel below on mobile)
- Brand: "pikAui" with lightning bolt icon ⚡

## Important Notes
- Do NOT use recharts (npm blocked it). Use inline SVG for charts.
- @tambo-ai/react is already installed
- @livekit/components-react is already installed  
- livekit-client is already installed
- zod is already installed
- Use TypeScript throughout
- All components must be client components ("use client")
