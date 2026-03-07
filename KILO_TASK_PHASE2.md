# Kilo Task: pikAui PM — Phase 2 Frontend Components

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Recharts 2.15.4 (already installed) for all charts
- Framer Motion (already installed) for animations
- **LIGHT THEME ONLY** — white backgrounds, soft pastels, never dark

## Color System
- Primary gradient: `#6c5ce7` → `#0984e3`
- Border color: `#e8eaf0`  
- Background: `#f8f9fc`
- Text primary: `#1a1a2e`
- Text muted: `#6b7280`

## Base path: `src/`

---

## Task 1: Create `src/components/tabs/AnalyticsTab.tsx`

Full analytics dashboard tab. Import everything from `@/lib/types`.

```typescript
interface AnalyticsTabProps {
  data: AnalyticsData;   // from @/lib/types
  projectId: string;
  projectName: string;
}
```

### Section 1: Health Overview (top row — 4 stat cards)
Calculate from `data`:
- **Total hours logged this week**: sum of `teamUtil[].hours_this_week`
- **Budget burn %**: highest `(cost_burned/budget_allocated*100)` across `budget[]`  
- **On-track milestones**: count `milestones[].health === 'on_track'`
- **Active risks**: `risks.length`

Each card: white rounded-2xl, 4px left border in project color, title + big number + subtitle.

### Section 2: Burndown Chart (left, 60% width)
Line chart using Recharts. Data: `data.burndown` (BurndownPoint[]).
- X axis: `log_date` (show last 7 dates)
- Two lines: `remaining` (red dashed) and `completed` (green solid)
- Show a third "ideal" line: linear from total tasks on day 0 to 0 on last day
- Custom tooltip showing date + values
- Title: "Sprint Burndown" with subtitle sprint name

### Section 3: Velocity Chart (right, 40% width)
Bar chart using Recharts. Data: `data.velocity` (VelocityPoint[]).
- X axis: sprint name
- Two bars side by side: `completed` (purple) and `total` (gray)
- Title: "Team Velocity"

### Section 4: Budget Tracker (full width)
For each item in `data.budget`:
- Project name + color dot
- Budget allocated vs cost burned (show SAR amounts)  
- Horizontal progress bar (green if <60%, yellow 60-80%, red >80%)
- `deadline` formatted as "Due Mar 31"
- Show estimated completion date: `deadline * (budget/cost_burned_rate)`

### Section 5: Team Utilization (left, 50%)
For each member in `data.teamUtil`:
- Avatar circle (initial) with `avatar_color`
- Name + `hours_this_week`h this week
- Mini bar: hours_this_week / 40 * 100% (red if >40h)
- Rate: $`hourly_rate`/h

### Section 6: Time Heatmap (right, 50%)
Simple heatmap: last 14 days on X axis, team members on Y axis.
Use `data.timeLogs` (TimeLogDay[]).
- Cell color intensity = hours (0=white, 6+=deep purple)
- Tooltip: "John · Mon Mar 4 · 4.5h"

### Section 7: Risk Panel (full width, only if data.risks.length > 0)
For each risk in `data.risks`:
- Severity badge (high=red, medium=yellow, low=blue)
- risk_type icon: ⚠️ overdue, 🔥 overloaded, 💸 budget, 📉 velocity
- Title + detail text
- "Dismiss" button (just UI, no API needed yet)

---

## Task 2: Create `src/components/tabs/MilestonesTab.tsx`

```typescript
interface MilestonesTabProps {
  milestones: Milestone[];    // from @/lib/types
  projectId: string;
  projectName: string;
  onRefresh: () => void;
}
```

### Layout
- Header: "Milestones" + project name + "+ Add Milestone" button
- Add form (AnimatePresence slide-down): name, due_date, description → POST /api/milestones
- Timeline view: vertical timeline with milestone cards

### Each milestone card
- Left: color dot (green=achieved, red=overdue, yellow=soon, blue=on_track)
- Center: milestone name + due date + health badge + progress (done_tasks/total_tasks)
- Right: status dropdown (pending/achieved/missed) → PATCH /api/milestones
- Health badges: "On Track" (green), "Due Soon" (amber), "Overdue" (red), "Achieved" (teal)

### Bottom: countdown
"🏁 Next milestone: {name} in {N} days"

---

## Task 3: Create `src/components/tabs/TimeLogTab.tsx`

```typescript
interface TimeLogTabProps {
  projectId: string;
  projectName: string;
  team: TeamMember[];
}
```

### Layout
- Header: "Time Logs" + project dropdown + date range picker (last 7/14/30 days)
- On mount + on filter change: fetch `/api/timelogs?projectId=X&days=Y`
- Add Time Log form: task name (free text), user dropdown, hours (0.5 step), date, note → POST /api/timelogs

### Summary row
4 mini stat cards: total hours, total cost (hours × avg rate $95), active contributors, avg hours/day

### Daily view
Group entries by `log_date`. For each day:
- Day header with total hours
- Entry rows: avatar + user_name + task_title + hours bubble + note

### Weekly totals bar
Simple bar chart (Recharts) showing total hours per team member for the selected period.

---

## Task 4: Create `src/components/pikaui/RiskPanel.tsx`

Voice sidebar widget shown when agent returns risks.

```typescript
interface RiskPanelProps {
  risks: Risk[];     // from @/lib/types
  project?: string;
}
```

Compact card. Each risk:
- One line: severity dot + icon + title
- Max 4 shown, "+ N more" if overflow
- CTA: "Run full analysis →" text button

---

## Important Rules
1. NEVER use dark backgrounds (`bg-gray-900`, `bg-black`, etc.)
2. ALL borders use `style={{ borderColor: "#e8eaf0" }}`
3. ALL gradients: `background: "linear-gradient(135deg,#6c5ce7,#0984e3)"`
4. Use `"use client"` at top of every component
5. Framer Motion `motion.div` with `initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}` on sections
6. Recharts: use `ResponsiveContainer width="100%" height={240}`
7. Handle empty states gracefully (show placeholder, not error)
8. Use `(arr || []).map(...)` for all array operations
9. Use optional chaining everywhere: `data?.burndown?.length`
10. No external icon libraries — use emoji or inline SVG

## File Checklist
- [ ] `src/components/tabs/AnalyticsTab.tsx`
- [ ] `src/components/tabs/MilestonesTab.tsx`
- [ ] `src/components/tabs/TimeLogTab.tsx`
- [ ] `src/components/pikaui/RiskPanel.tsx`
