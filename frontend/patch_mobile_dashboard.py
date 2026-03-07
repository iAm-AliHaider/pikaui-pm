"""
Mobile responsiveness patch for Dashboard.tsx:
1. Header compact on mobile (hide stats, smaller gap, smaller buttons)
2. Tab bar shows short 2-letter labels on mobile, full on sm+
3. Content area gets pb-28 so PTT button doesn't cover content
"""

path = "src/components/Dashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

changes = 0

# --- 1. Header: reduce px-6 to px-3 sm:px-6 on mobile ---
old_header = '<header className="flex-shrink-0 bg-white border-b px-6 py-3" style={{ borderColor: "#e8eaf0" }}>'
new_header = '<header className="flex-shrink-0 bg-white border-b px-3 sm:px-6 py-2 sm:py-3" style={{ borderColor: "#e8eaf0" }}>'
if old_header in src:
    src = src.replace(old_header, new_header)
    changes += 1
    print("Fix 1: header padding mobile-compact")

# --- 2. Project stats: hide on xs, show on sm ---
old_stats = '<div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-500">'
new_stats = '<div className="hidden sm:flex items-center gap-3 flex-shrink-0 text-xs text-gray-500">'
if old_stats in src:
    src = src.replace(old_stats, new_stats)
    changes += 1
    print("Fix 2: project stats hidden on mobile")

# --- 3. New Task / New Project buttons: smaller on mobile ---
old_btns = '<div className="flex items-center gap-2 flex-shrink-0">'
new_btns = '<div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">'
if old_btns in src:
    src = src.replace(old_btns, new_btns, 1)  # only first occurrence (header buttons)
    changes += 1
    print("Fix 3: header button gap mobile-compact")

# --- 4. Tab bar: px-6 -> px-2 sm:px-6, tab labels show short form on mobile ---
old_tab_bar_inner = '<div className="flex gap-1 px-6 min-w-max">'
new_tab_bar_inner = '<div className="flex gap-0.5 sm:gap-1 px-2 sm:px-6 min-w-max">'
if old_tab_bar_inner in src:
    src = src.replace(old_tab_bar_inner, new_tab_bar_inner)
    changes += 1
    print("Fix 4: tab bar padding mobile-compact")

# --- 5. Tab button text: show short label on mobile, full on sm ---
# Current: {tab.label}  ->  short on mobile, full on sm
old_tab_btn = '''className="relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap"
              style={{ color: activeTab === tab.id ? "#6c5ce7" : "#9ca3af" }}
            >
              {tab.label}'''
new_tab_btn = '''className="relative px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
              style={{ color: activeTab === tab.id ? "#6c5ce7" : "#9ca3af" }}
            >
              <span className="sm:hidden">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>'''
if old_tab_btn in src:
    src = src.replace(old_tab_btn, new_tab_btn)
    changes += 1
    print("Fix 5: tab labels - icon on mobile, full on sm")

# --- 6. Content scroll area: add pb-28 so PTT button doesn't cover content ---
old_scroll = '<div className="flex-1 overflow-y-auto">'
new_scroll = '<div className="flex-1 overflow-y-auto pb-28">'
if old_scroll in src:
    src = src.replace(old_scroll, new_scroll)
    changes += 1
    print("Fix 6: content area pb-28 for PTT clearance")

# --- 7. Tab ICONS: update TABS array to use readable 2-letter icons ---
old_tabs = '''  const TABS = [
    { id: "overview",    label: t("tab.overview"),    icon: "O" },
    { id: "board",       label: t("tab.board"),       icon: "B" },
    { id: "team",        label: t("tab.team"),        icon: "T" },
    { id: "docs",        label: t("tab.documents"),   icon: "D" },
    { id: "analytics",   label: t("tab.analytics"),  icon: "A" },
    { id: "milestones",  label: t("tab.milestones"),  icon: "M" },
    { id: "timelog",     label: t("tab.timelog"),     icon: "L" },
    { id: "activity",    label: t("tab.activity"),    icon: "X" },
    { id: "summary",     label: t("tab.summary"),     icon: "S" },
  ];'''
new_tabs = '''  const TABS = [
    { id: "overview",    label: t("tab.overview"),   icon: "OV" },
    { id: "board",       label: t("tab.board"),      icon: "BD" },
    { id: "team",        label: t("tab.team"),       icon: "TM" },
    { id: "docs",        label: t("tab.documents"),  icon: "DC" },
    { id: "analytics",   label: t("tab.analytics"), icon: "AN" },
    { id: "milestones",  label: t("tab.milestones"), icon: "MS" },
    { id: "timelog",     label: t("tab.timelog"),    icon: "TL" },
    { id: "activity",    label: t("tab.activity"),   icon: "AC" },
    { id: "summary",     label: t("tab.summary"),    icon: "SU" },
  ];'''
if old_tabs in src:
    src = src.replace(old_tabs, new_tabs)
    changes += 1
    print("Fix 7: tab icons updated to 2-letter abbreviations")

# --- 8. New Task button: shorter text on mobile ---
old_new_task_btn = '''              onClick={() => setShowCreateTask(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl text-white"
              style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}
            >
              {t("header.newTask")}'''
new_new_task_btn = '''              onClick={() => setShowCreateTask(true)}
              className="px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-xl text-white"
              style={{ background: "linear-gradient(135deg,#6c5ce7,#0984e3)" }}
            >
              <span className="sm:hidden">+ Task</span>
              <span className="hidden sm:inline">{t("header.newTask")}</span>'''
if old_new_task_btn in src:
    src = src.replace(old_new_task_btn, new_new_task_btn)
    changes += 1
    print("Fix 8: new task button compact on mobile")

# --- 9. New Project button: hidden on mobile (PTT handles it) ---
old_new_proj_btn = '''              onClick={() => setShowCreateProject(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border"
              style={{ borderColor: "#6c5ce7", color: "#6c5ce7" }}
            >
              {t("header.newProject")}'''
new_new_proj_btn = '''              onClick={() => setShowCreateProject(true)}
              className="hidden sm:block px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border"
              style={{ borderColor: "#6c5ce7", color: "#6c5ce7" }}
            >
              {t("header.newProject")}'''
if old_new_proj_btn in src:
    src = src.replace(old_new_proj_btn, new_new_proj_btn)
    changes += 1
    print("Fix 9: new project button hidden on mobile")

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"\nApplied {changes}/9 fixes to Dashboard.tsx")
