# Mobile UI Overhaul + PWA

## Tasks

### 1. Mobile-First Layout (src/app/page.tsx)
- On mobile: voice controls at TOP, generative panel BELOW (full width stacked)
- On desktop: keep side-by-side layout
- Voice button should be prominent and centered
- Use `flex-col md:flex-row` pattern

### 2. Widget-Style Components (src/components/GenerativePanel.tsx + pikaui/*.tsx)
- Each component should render as a floating widget/card
- Rounded corners (rounded-2xl), glassmorphism (backdrop-blur-xl bg-white/10)  
- Slight shadow and border glow
- Smooth entrance animation (slide up + fade in)
- Components should stack vertically in a scrollable area
- Each widget should have a small close/dismiss button

### 3. ProductCard.tsx - Widget Style
- Card with product image on top, info below
- Price badge in corner
- Stock status pill
- Color dot indicator
- Mobile: full width card with padding

### 4. FormStep.tsx - Widget Style  
- Progress bar at top showing step X of Y
- Fields as rounded input-like displays
- Filled fields have green check
- Empty fields have subtle placeholder style

### 5. ApprovalCard.tsx - Widget Style
- Amount displayed prominently if present
- Status badge (pending=yellow, approved=green, rejected=red)
- Action buttons at bottom as pills

### 6. DataChart.tsx - Widget Style
- Chart fills widget width
- Title at top, legend at bottom
- Responsive sizing

### 7. StatusBanner.tsx - Widget Style
- Compact notification pill
- Icon + message in one line
- Progress bar below if applicable

### 8. VoiceAgent.tsx - Mobile Optimized
- Large mic button (w-20 h-20 on mobile)
- Animated ring pulse when active
- Status text below
- Agent speaking indicator (waveform)

### 9. PWA Support
- Create public/manifest.json with name "pikAui", short_name "pikAui", theme_color "#8B5CF6", background_color "#0a0a0a"
- Create public/icons (use SVG for now, 192x192 and 512x512 placeholders)
- Add manifest link and meta tags to layout.tsx
- Create public/sw.js (basic service worker with cache-first for static assets)
- Add SW registration in layout.tsx

### 10. GenerativePanel.tsx
- Scrollable container for widgets
- Empty state: "Say something to see the magic" with sparkle icon
- Auto-scroll to latest widget
- Each widget has entrance animation

## Design Tokens
- Background: #0a0a0a
- Card bg: rgba(255,255,255,0.05) with backdrop-blur-xl
- Card border: rgba(255,255,255,0.1)
- Accent purple: #8B5CF6
- Accent cyan: #06B6D4
- Success: #10B981
- Warning: #F59E0B
- Error: #EF4444
- Text primary: #FFFFFF
- Text secondary: #A1A1AA
