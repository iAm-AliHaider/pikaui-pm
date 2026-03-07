# Kilo Task: Wire German i18n through all UI components

## What's Already Done (DO NOT TOUCH)
- `src/lib/i18n.ts` — complete EN+DE translation dictionary (200+ keys)
- `src/components/LocaleContext.tsx` — `useLocale()` hook, `t()` helper, `LanguageToggle` component
- `src/app/layout.tsx` — already wraps children with `<LocaleProvider>`
- `src/app/page.tsx` — already uses `useLocale()`, passes `languageToggle={<LanguageToggle />}` to Dashboard

## Your Job
Wire `useLocale()` and `t("key")` into ALL components listed below.
Study `src/lib/i18n.ts` for the correct key names before you start.

---

## Rule: How to use translations

In every component, add at the top of the function body:
```typescript
const { t } = useLocale();
```

And import at the top of the file:
```typescript
import { useLocale } from "@/components/LocaleContext";
```

Replace all hardcoded English strings with `t("key")` using the keys from `src/lib/i18n.ts`.

**DO NOT** change styles, layout, logic, or props — only replace string literals.
**DO NOT** use emojis anywhere.

---

## Component 1: `Dashboard.tsx`

**Path:** `frontend/src/components/Dashboard.tsx`

Changes:
1. Add `import { useLocale } from "@/components/LocaleContext";`
2. Add `import { LanguageToggle } from "@/components/LocaleContext";` (if not already there)
3. Add prop: `languageToggle?: React.ReactNode` to `DashboardProps` interface
4. Inside component body add: `const { t } = useLocale();`
5. Update TABS array to use `t()`:
```typescript
const TABS = [
  { id: "overview",   label: t("tab.overview"),   icon: "O" },
  { id: "board",      label: t("tab.board"),       icon: "B" },
  { id: "team",       label: t("tab.team"),        icon: "T" },
  { id: "docs",       label: t("tab.documents"),   icon: "D" },
  { id: "analytics",  label: t("tab.analytics"),   icon: "A" },
  { id: "milestones", label: t("tab.milestones"),  icon: "M" },
  { id: "timelog",    label: t("tab.timelog"),     icon: "L" },
  { id: "activity",   label: t("tab.activity"),    icon: "X" },
  { id: "summary",    label: t("tab.summary"),     icon: "S" },
];
```
6. Replace "New Task" button text with `{t("header.newTask")}`
7. Replace "New Project" button text with `{t("header.newProject")}`
8. In the header, render `{props.languageToggle}` next to the "New Project" button
9. Replace risk badge text to use `t("header.risks")` and `t("header.risks.plural")`

---

## Component 2: `tabs/OverviewTab.tsx`

Replace all hardcoded strings:
- "No project selected." → `{t("app.noProject")}`
- "Progress" → `{t("overview.progress")}`
- "In Progress" (section heading) → `{t("overview.inProgress")}`
- "No active tasks." → `{t("overview.noActive")}`
- "+ Add Task" button → `{t("overview.addTask")}`
- "Overdue Tasks" → `{t("overview.overdueTasks")}`
- "No overdue tasks." → `{t("overview.noOverdue")}`
- "Active Sprint" → `{t("overview.activeSprint")}`
- "No active sprint." → `{t("overview.noSprint")}`
- "Ends" → `{t("overview.ends")}`
- "Overdue" badge → `{t("board.overdue")}`

---

## Component 3: `tabs/BoardTab.tsx`

Replace:
- Column labels in COLS array: use `t("board.todo")`, `t("board.inProgress")`, `t("board.done")`
  Note: COLS is defined outside the component. Move it INSIDE the component function so `t()` works.
- "Drop tasks here" → `{t("board.dropHere")}`
- `window.confirm("Delete this task?")` → `window.confirm(t("board.deleteConfirm"))`
- "Overdue" badge → `{t("board.overdue")}`

---

## Component 4: `tabs/TeamTab.tsx`

Replace visible strings with `t("team.xxx")` keys.
Study the component first to find all hardcoded strings.

---

## Component 5: `tabs/DocsTab.tsx`

Replace visible strings with `t("docs.xxx")` keys.

---

## Component 6: `modals/TaskModal.tsx`

Replace:
- "Status" label → `{t("taskModal.status")}`
- "Priority" label → `{t("taskModal.priority")}`
- "Progress" label → `{t("taskModal.progress")}`
- "Hours Worked" → `{t("taskModal.hoursWorked")}`
- "Hours Estimated" → `{t("taskModal.hoursEst")}`
- "Start Date" → `{t("taskModal.startDate")}`
- "Due Date" → `{t("taskModal.dueDate")}`
- "Description" → `{t("taskModal.description")}`
- "Assigned to" → `{t("taskModal.assignedTo")}`
- "Comments" → `{t("taskModal.comments")} ({comments.length})`
- "Add a comment…" placeholder → `{t("taskModal.addComment")}`
- "Send" → `{t("taskModal.send")}`
- "Save Changes" → `{t("taskModal.save")}`
- "Saving…" → `{t("taskModal.saving")}`
- "Cancel" → `{t("taskModal.cancel")}`
- "Overdue" badge → `{t("taskModal.overdue")}`
- Status option labels: `t("status.todo")`, `t("status.in_progress")`, `t("status.done")`
- Priority option labels: `t("priority.low")`, `t("priority.medium")`, `t("priority.high")`

---

## Component 7: `modals/CreateTaskModal.tsx`

Replace all visible strings using `t("createTask.xxx")` keys.
- Modal title → `{t("createTask.title")}`
- "Task Title" label → `{t("createTask.taskTitle")}`
- Placeholder → `{t("createTask.placeholder")}`
- "Description" label → `{t("createTask.description")}`
- "Project" label → `{t("createTask.project")}`
- "Status" label → `{t("createTask.status")}`
- "Priority" label → `{t("createTask.priority")}`
- "Assignee" label → `{t("createTask.assignee")}`
- "Unassigned" option → `{t("createTask.unassigned")}`
- "Due Date" label → `{t("createTask.dueDate")}`
- "Hours Estimated" → `{t("createTask.hours")}`
- "Create Task" button → `{t("createTask.save")}`
- "Creating…" → `{t("createTask.saving")}`
- "Cancel" → `{t("createTask.cancel")}`
- Error message → `{t("createTask.error")}`
- Priority button labels: `t("priority.low")`, `t("priority.medium")`, `t("priority.high")`
- Status option labels: `t("status.todo")`, `t("status.in_progress")`, `t("status.done")`

---

## Component 8: `modals/CreateProjectModal.tsx`

Replace all visible strings using `t("createProject.xxx")` keys.
- Modal title → `{t("createProject.title")}`
- "Project Name" label → `{t("createProject.name")}`
- Placeholder → `{t("createProject.placeholder")}`
- "Description" label → `{t("createProject.desc")}`
- "Status" label → `{t("createProject.status")}`
- "Color" label → `{t("createProject.color")}`
- "Manager" label → `{t("createProject.manager")}`
- "None" option → `{t("createProject.none")}`
- "Budget" label → `{t("createProject.budget")}`
- "Deadline" label → `{t("createProject.deadline")}`
- "Create Project" button → `{t("createProject.save")}`
- "Creating…" → `{t("createProject.saving")}`
- "Cancel" → `{t("createProject.cancel")}`
- Error message → `{t("createProject.error")}`
- Status option labels: `t("project.active")`, `t("project.on_hold")`, `t("project.completed")`

---

## Component 9: `VoiceSidebar.tsx`

Replace:
- "Voice Assistant" or similar heading → `{t("voice.title")}`
- Tab group labels → `t("voice.projects")`, `t("voice.boardCmds")`, `t("voice.teamCmds")`, `t("voice.insights")`
- "Say this now:" → `{t("voice.sayNow")}`
- "Clear" button → `{t("voice.clearWidgets")}`
- Empty state message → `{t("voice.noWidgets")}`
- Connected/connecting/disconnected status → `t("voice.connected")` etc.

---

## Build Verification

After all changes:
```
cd frontend
npx next build
```

Fix ALL TypeScript errors. Build must pass with zero errors.

When done, run:
```
openclaw system event --text "Done: German i18n wired into all 9 components, build passing" --mode now
```
