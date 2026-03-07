# Kilo Task: pikAui PM Phase 3 — Activity Feed + Summary + Quick Commands

## Rules (non-negotiable)
- LIGHT THEME ONLY — white/gray backgrounds, NO dark modes
- All borders: `style={{ borderColor: "#e8eaf0" }}`
- Primary gradient: `background: "linear-gradient(135deg,#6c5ce7,#0984e3)"`
- `"use client"` at top of every file
- Framer Motion `motion.div` with `initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}`
- `(arr || []).map()` for every array
- Optional chaining everywhere
- Recharts: `ResponsiveContainer width="100%" height={220}`
- No external icon libraries — emoji only

---

## Task 1: `src/components/tabs/ActivityFeedTab.tsx`

```typescript
interface ActivityFeedTabProps {
  projectId: string;
  projectName: string;
}
```

### Behavior
- On mount: fetch `GET /api/activity?projectId={projectId}&days=14&limit=50`
- Re-fetch when `projectId` changes
- State: `entries: ActivityEntry[]`, `loading`, `filter: 'all'|'tasks'|'time'|'milestones'`
- Types from `@/lib/types` (ActivityEntry)

### Header
- Title "Activity Feed" + project name
- Filter pill buttons: All | Tasks | Time Logs | Milestones
- Refresh button (🔄) that re-fetches

### Entry List
Group entries by date (Today, Yesterday, then "Mon Mar 4" etc.).

For each entry:
- Left: Avatar circle (first letter of user_name, random color from avatar_color palette)
- Center:
  - **user_name** + action label (see ACTION_LABELS below)
  - **entity_name** in bold/purple
  - Time: "2h ago", "yesterday 3:45pm", etc. (relative format)
  - For `hours_logged`: show meta.hours in a small badge
  - For `status_changed`: show from→to with arrow
- Right: entity type icon

### ACTION_LABELS map
```
created        → "created"
updated        → "updated"
status_changed → "moved"
hours_logged   → "logged time on"
commented      → "commented on"
milestone_added → "added milestone"
sprint_created → "created sprint"
```

### ACTION_ICONS map
```
task      → "✅"
timelog   → "⏱"
milestone → "🏁"
sprint    → "🚀"
project   → "📁"
```

### Empty state
Big emoji 📭 + "No activity yet. Start working on tasks!"

### Loading state
3 skeleton rows (h-12 rounded-xl bg-gray-50 animate-pulse)

---

## Task 2: `src/components/tabs/SummaryTab.tsx`

Cross-project health dashboard. NO props needed — fetches its own data.

```typescript
// Fetches: GET /api/data (for project stats) + GET /api/analytics (for budget/risks)
// No props needed — self-contained
```

### Behavior
- On mount: fetch `/api/data` and `/api/analytics` in parallel
- Calculate health score per project (0-100):
  ```
  score = (
    completion_pct * 0.3 +           // 30% weight
    (1 - overdue_ratio) * 100 * 0.3 + // 30% weight (0 overdue = 100)
    (1 - budget_pct/100) * 100 * 0.2 + // 20% weight (under budget = good)
    sprint_velocity_score * 0.2        // 20% weight (use 75 as fallback)
  )
  ```
  Where:
  - `completion_pct` = `done_tasks / total_tasks * 100`
  - `overdue_ratio` = count tasks past due / total tasks (use 0 if unknown)
  - `budget_pct` = `cost_burned / budget_allocated * 100` (from analytics, 0 if no budget)
  - `sprint_velocity_score` = `completed/total * 100` from latest sprint (75 fallback)

### Layout

**Section 1: Health Scorecard (top)**
3 big cards side by side (one per project). Each card:
- Project color left border (4px)
- Health score: large number (0-100) + letter grade (A=90+, B=75+, C=60+, D=50+, F=below)
- Grade color: green A, teal B, yellow C, orange D, red F
- Project name + status badge
- 4 mini stats: Completion% | Overdue | Budget% | Hours/week
- Recharts RadialBarChart showing health score (single bar, colored by grade)

**Section 2: Comparison Table**
Full-width table comparing all projects:
| Project | Tasks | Done | Overdue | Budget Used | Hours/wk | Deadline | Health |
With color-coded cells (red if bad, green if good).

**Section 3: Velocity Trend**
Combined line chart: one line per project, x=sprint, y=completed tasks.
Use different colors per project (project.color).

**Section 4: Team Distribution**
Stacked bar chart: x=team member, bars=hours per project (color per project).

---

## Task 3: `src/components/QuickCommands.tsx`

Quick voice command shortcut grid for the VoiceSidebar.

```typescript
interface QuickCommandsProps {
  onCommand: (text: string) => void;  // called when user clicks — parent will send to voice
  isConnected: boolean;
}
```

### Layout
- Title: "Quick Commands" (small, uppercase, gray)
- Grid: 2 columns of buttons
- Each button: emoji icon + short label, rounded-xl, border, hover:shadow, hover:border-purple
- Click → calls `onCommand(voiceText)`
- Disabled (with opacity-40) when `!isConnected`

### Commands (20 buttons in 4 groups)

**Projects**
- 📋 "List projects" → "Show me all projects"
- 📊 "Analytics" → "Show full analytics"
- 📈 "Standup" → "Daily standup"
- ⚠️ "Detect risks" → "Detect risks"

**Board**
- ▦ "Show board" → "Show the board"
- ✅ "Done tasks" → "Show done tasks"
- 🔴 "High priority" → "Search high priority tasks"
- 🔍 "Search tasks" → "Search in progress tasks"

**Team**
- 👥 "Workload" → "Show team workload"
- 🏆 "Top performer" → "Who has the most done tasks?"
- 👤 "Assign" → "Who should I assign the next task to?"
- ⏱ "Log time" → "Log 2 hours on the current task"

**Insights**
- 🏁 "Milestones" → "Show milestones"
- 💰 "Budget" → "Show analytics"
- 📄 "Search docs" → "Search docs for deployment guide"
- 🗓 "Sprint status" → "Show sprint analytics"
- ➕ "New task" → "Create a new high priority task"
- 📝 "New sprint" → "Create sprint"
- 🔎 "Activity" → "Show recent activity"
- 💡 "Suggest" → "Suggest who to assign the next task to"

---

## Important
- All 3 files must compile with zero TypeScript errors
- Handle all undefined/null cases gracefully
- Empty states for every data-dependent section
- Mobile responsive (flex-col on small screens)
