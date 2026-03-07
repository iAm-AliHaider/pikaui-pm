"""
Mobile patch for FloatingVoiceButton.tsx:
- Use safe-area inset for bottom (iPhone home indicator)
- Slightly smaller on mobile
- Ensure minWidth works on small screens
"""

path = "src/components/FloatingVoiceButton.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

changes = 0

# 1. Container: use ptt-fixed class for safe-area bottom, reduce gap on mobile
old_container = 'className="fixed bottom-6 inset-x-0 flex flex-col items-center gap-3 z-50 pointer-events-none"'
new_container = 'className="fixed inset-x-0 flex flex-col items-center gap-2 sm:gap-3 z-50 pointer-events-none ptt-fixed"'
if old_container in src:
    src = src.replace(old_container, new_container)
    changes += 1
    print("Fix 1: container uses safe-area bottom, compact gap")

# 2. PTT button: minWidth responsive - smaller on mobile
old_minw = '          minWidth: "230px",'
new_minw = '          minWidth: "min(90vw, 230px)",'
if old_minw in src:
    src = src.replace(old_minw, new_minw)
    changes += 1
    print("Fix 2: PTT button min-width responsive")

# 3. Toast: max-width responsive
old_toast = 'className="pointer-events-auto max-w-sm text-center text-sm text-gray-700 bg-white rounded-2xl px-4 py-2.5 shadow-md"'
new_toast = 'className="pointer-events-auto mx-4 max-w-sm text-center text-sm text-gray-700 bg-white rounded-2xl px-4 py-2.5 shadow-md"'
if old_toast in src:
    src = src.replace(old_toast, new_toast)
    changes += 1
    print("Fix 3: toast has horizontal margin on mobile")

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"\nApplied {changes}/3 fixes to FloatingVoiceButton.tsx")
