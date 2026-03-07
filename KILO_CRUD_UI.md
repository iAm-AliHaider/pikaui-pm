# Kilo Task: Full CRUD UI for pikAui PM

## Goal
Add complete Create/Edit/Delete functionality to the pikAui PM dashboard.
The backend APIs are already written. You only need to build UI components and wire them in.

## Design Rules (NON-NEGOTIABLE)
- Light theme ONLY — white backgrounds, soft grays, no dark mode
- Consistent with existing design: rounded-2xl cards, border-color #e8eaf0, purple gradient #6c5ce7→#0984e3
- No emojis in any code, text, labels, or UI elements
- Framer Motion for modal open/close animations (already installed)
- Tailwind CSS v4 — NO dynamic class strings, use full class names only

---

## Task 1: Create `CreateTaskModal.tsx`

**Path:** `frontend/src/components/modals/CreateTaskModal.tsx`

Full-screen backdrop modal (same pattern as TaskModal.tsx) with a form to create a new task.

### Props
```typescript
interface CreateTaskModalProps {
  projects: Project[];          // from types.ts
  team: TeamMember[];           // from types.ts
  defaultProjectId?: string;    // pre-select this project
  defaultStatus?: string;       // pre-select status ("todo" | "in_progress" | "done")
  onClose: () => void;
  onCreated: () => void;        // called after successful create (triggers refresh)
}
```

### Form Fields
1. **Title** (text input, required) — auto-focused on open
2. **Description** (textarea, 2 rows, optional)
3. **Project** (select dropdown) — list all projects by name, pre-select defaultProjectId
4. **Status** (select) — To Do / In Progress / Done, pre-select defaultStatus or "todo"
5. **Priority** (3 toggle buttons: Low / Medium / High) — default Medium, color-coded
6. **Assignee** (select dropdown) — "Unassigned" + list all team members by name
7. **Due Date** (date input, optional)
8. **Hours Estimated** (number input, step 0.5, optional)

### Behavior
- On submit: POST to `/api/tasks` with `{ title, description, project_id, status, priority, assignee_name, due_date, hours_estimated }`
- Show loading spinner on the Save button while request is in flight
- On success: call `onCreated()` then `onClose()`
- On error: show inline error message in red text below the form
- Cancel button calls `onClose()`
- Backdrop click calls `onClose()`

### Style Reference (copy from TaskModal.tsx)
- Backdrop: `fixed inset-0 z-50 flex items-center justify-center`, black/30 blur background
- Modal card: `bg-white rounded-2xl shadow-xl border w-full max-w-lg max-h-[85vh] overflow-y-auto mx-4`
- Save button: `background: linear-gradient(135deg,#6c5ce7,#0984e3)` white text, px-5 py-2 rounded-xl

---

## Task 2: Create `CreateProjectModal.tsx`

**Path:** `frontend/src/components/modals/CreateProjectModal.tsx`

Modal to create a new project.

### Props
```typescript
interface CreateProjectModalProps {
  team: TeamMember[];
  onClose: () => void;
  onCreated: () => void;
}
```

### Form Fields
1. **Project Name** (text input, required, auto-focused)
2. **Description** (textarea, 2 rows, optional)
3. **Status** (select) — Active / On Hold / Completed
4. **Color** (8 color swatches, click to select) — colors: `#6c5ce7 #0984e3 #00b894 #fd79a8 #fdcb6e #e17055 #a29bfe #00cec9`, default first
5. **Manager** (select dropdown) — "None" + list all team members
6. **Budget** (number input, optional, placeholder "e.g. 50000")
7. **Deadline** (date input, optional)

### Behavior
- POST to `/api/projects` with `{ name, description, status, color, manager_name, budget, deadline }`
- Same loading/error/close pattern as CreateTaskModal

---

## Task 3: Update `BoardTab.tsx`

**Path:** `frontend/src/components/tabs/BoardTab.tsx`

### Changes Required

1. **Add "New Task" button** in each column header (next to the task count badge)
   - Small "+" icon button: `w-6 h-6 rounded-full border-2 border-dashed text-gray-400 hover:border-purple-400 hover:text-purple-500 text-sm font-bold transition-colors`
   - Clicking it: call `onCreateTask(col.id)` where col.id is "todo" / "in_progress" / "done"

2. **Add "Delete Task" button** on task cards
   - Tiny "x" button in the top-right corner of each card, visible only on hover (`group-hover:opacity-100 opacity-0 transition-opacity`)
   - Clicking it: show a small inline confirmation (just `window.confirm("Delete this task?")` is fine)
   - On confirm: call `onDeleteTask(task.id)`
   - `e.stopPropagation()` to prevent opening TaskModal

3. **Updated Props**
```typescript
export function BoardTab({ tasks, project, onTaskClick, onRefresh, onCreateTask, onDeleteTask }: {
  tasks: Task[];
  project: Project | undefined;
  onTaskClick: (t: Task) => void;
  onRefresh: () => void;
  onCreateTask: (defaultStatus: string) => void;
  onDeleteTask: (taskId: string) => void;
})
```

---

## Task 4: Update `Dashboard.tsx`

**Path:** `frontend/src/components/Dashboard.tsx`

### Changes Required

1. **Add state** at top of component:
```typescript
const [showCreateTask, setShowCreateTask] = useState(false);
const [createTaskStatus, setCreateTaskStatus] = useState("todo");
const [showCreateProject, setShowCreateProject] = useState(false);
```

2. **Import new modals** at top:
```typescript
import { CreateTaskModal }    from "./modals/CreateTaskModal";
import { CreateProjectModal } from "./modals/CreateProjectModal";
```

3. **Add two buttons to the header** (right side, next to the existing content):
   - "New Task" button: small, pill-shaped, gradient background, white text, opens CreateTaskModal
   - "New Project" button: small, pill-shaped, white bg with purple border, opens CreateProjectModal
   - Style: `px-3 py-1.5 text-xs font-semibold rounded-xl`

4. **Wire BoardTab** — pass the new props:
```typescript
onCreateTask={(status) => { setCreateTaskStatus(status); setShowCreateTask(true); }}
onDeleteTask={async (taskId) => {
  await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
  onRefresh();
}}
```

5. **Render modals** at the bottom of the return (after TaskModal AnimatePresence):
```tsx
{showCreateTask && (
  <CreateTaskModal
    projects={data.projects}
    team={data.team}
    defaultProjectId={activeProjectId ?? undefined}
    defaultStatus={createTaskStatus}
    onClose={() => setShowCreateTask(false)}
    onCreated={() => { setShowCreateTask(false); onRefresh(); }}
  />
)}
{showCreateProject && (
  <CreateProjectModal
    team={data.team}
    onClose={() => setShowCreateProject(false)}
    onCreated={() => { setShowCreateProject(false); onRefresh(); }}
  />
)}
```

6. **Add "Edit Project" inline in header** — on the active project pill, add a small pencil icon button that opens a simple inline form to edit the project name/status. (Optional — skip if adds too much complexity)

---

## Task 5: Update `OverviewTab.tsx`

**Path:** `frontend/src/components/tabs/OverviewTab.tsx`

Add an "Add Task" button in the "In Progress" and "Recent Tasks" sections that calls `onCreateTask?.()` from props:

```typescript
export function OverviewTab({ project, tasks, team, sprints, onTaskClick, onCreateTask }: {
  // ... existing props
  onCreateTask?: () => void;
})
```

Add a "Add Task" button (small, with "+" prefix) somewhere visible in the overview — below the task list or in the card header.

---

## What NOT to Change
- `page.tsx` — do not touch
- `VoiceSidebar.tsx` — do not touch
- `GenerativePanel.tsx` — do not touch
- `TaskModal.tsx` — do not touch (it handles edit, not create)
- Any API routes or lib files

---

## Build & Verify

After all changes, run:
```
cd frontend
npx next build
```

Fix all TypeScript errors. The build must complete with zero errors before finishing.

If build fails, fix the errors and run again.
