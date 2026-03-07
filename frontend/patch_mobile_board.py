"""
Mobile responsiveness patch for BoardTab.tsx:
- Wrap columns in overflow-x-auto so user can swipe between columns
- Reduce padding on mobile
"""

path = "src/components/tabs/BoardTab.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

changes = 0

# 1. Outer container: reduce padding on mobile
old_outer = '<div className="p-5 h-full">'
new_outer = '<div className="p-2 sm:p-5 h-full">'
if old_outer in src:
    src = src.replace(old_outer, new_outer)
    changes += 1
    print("Fix 1: outer padding mobile-compact")

# 2. Columns container: add overflow-x-auto for horizontal swipe on mobile
old_cols = '<div className="flex gap-4 h-full" style={{ minHeight: "500px" }}>'
new_cols = '<div className="flex gap-3 sm:gap-4 h-full overflow-x-auto pb-2" style={{ minHeight: "500px" }}>'
if old_cols in src:
    src = src.replace(old_cols, new_cols)
    changes += 1
    print("Fix 2: columns container overflow-x-auto")

# 3. Column min-width: ensure columns don't shrink too much on mobile
old_col_div = 'className="flex-1 flex flex-col min-w-[220px] rounded-2xl overflow-hidden"'
new_col_div = 'className="flex-1 flex flex-col min-w-[270px] sm:min-w-[220px] rounded-2xl overflow-hidden"'
if old_col_div in src:
    src = src.replace(old_col_div, new_col_div)
    changes += 1
    print("Fix 3: column min-width for mobile")

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"\nApplied {changes}/3 fixes to BoardTab.tsx")
