# Frozen Features Directory

This file documents all currently functional features of the application, detailing their location, handlers, styles, and crucial load-bearing engineering choices. **Do not modify or refactor these sections without explicit user request.**

---

## 1. Task Card in Timeline (Title Display, Full Width, Colors)
- **File:** `src/components/CalendarViews.tsx`
- **Component:** `DraggableTaskBlock` (line 1560)
- **Why it is load-bearing:**
  - Standard backgrounds and boundaries must match task status: Completed card styles get a neutral grey tone (`bg: #F3F4F6`, border: `1px solid #E5E7EB`, text: `line-through` and `color: #9CA3AF`). Active card styles utilize the dynamic blue/accent palette (`bg: #EBF5FF`, border: `1px solid #BFDBFE`, text: `color: #1E40AF`).
  - Height: Minimum height of `44px` ensures compliance with mobile-touch targets.
  - Positioning: `position: absolute` with dynamic `top`, `height`, `left`, and `width` passed from parent, mapped precisely using calculated column layouts inside clusters.

---

## 2. Expand/Collapse Subtasks on Task Card
- **File:** `src/components/CalendarViews.tsx`
- **Component / Function:** `DraggableTaskBlock` (lines 1812–1855)
- **Exact Handler:**
  ```tsx
  onTouchEnd={(e) => {
    lastTouchTime.current = Date.now()
    e.stopPropagation()   // stops the card tap counter from seeing this
    e.preventDefault()
    if (!moved.current) {
      setExpanded(prev => !prev)
    }
  }}
  onMouseUp={(e) => {
    if (Date.now() - lastTouchTime.current < 500) return
    e.stopPropagation()
    if (!moved.current) setExpanded(prev => !prev)
  }}
  ```
- **Why it is load-bearing (WHY it exists):**
  - `e.stopPropagation()` prevents the click or touch gesture from bubble-propagating to the card-level tap counter (`handleUnifiedTap`). If omitted, tapping the chevron would count as a tap to the parent card, instantly opening the task edit sheet.
  - `e.preventDefault()` inside `onTouchEnd` prevents mouseup emulation from firing a second synthetic tap.

---

## 3. Tap Title to Edit Task
- **File:** `src/components/CalendarViews.tsx`
- **Component / Location:** `DraggableTaskBlock` -> Title Paragraph (`<p>` tag inside MAIN ROW, lines 1897–1925)
- **Exact Handlers:**
  ```tsx
  onTouchEnd={(e) => {
    lastTouchTime.current = Date.now()
    e.stopPropagation()
    e.preventDefault()  // CRITICAL — prevents the synthetic onClick from also firing
    handleUnifiedTap(true)
  }}
  onMouseUp={(e) => {
    if (Date.now() - lastTouchTime.current < 500) return
    e.stopPropagation()
    handleUnifiedTap(true)
  }}
  ```
- **Why it is load-bearing (WHY it exists):**
  - Isolates tapping on the title specifically to activate editing via `handleUnifiedTap(true)`. Uses `e.preventDefault()` in `onTouchEnd` to avoid dual touch/mouse synthetic tap registration, preventing double-clicks/ghost triggers.

---

## 4. Task Complete Circle
- **File:** `src/components/CalendarViews.tsx`
- **Component / Location:** `DraggableTaskBlock` -> Completion Button (`<motion.button>`, lines 1929–1958)
- **Exact Handlers:**
  ```tsx
  onTouchEnd={(e) => {
    lastTouchTime.current = Date.now()
    e.stopPropagation()
    e.preventDefault()
    toggleTaskComplete(task.id)
  }}
  onMouseUp={(e) => {
    if (Date.now() - lastTouchTime.current < 500) return
    e.stopPropagation()
    toggleTaskComplete(task.id)
  }}
  ```
- **Why it is load-bearing (WHY it exists):**
  - `e.stopPropagation()` ensures checking/unchecking a task does not launch the edit sheet or count towards a triple-tap delete.
  - Expanding the touch hit-box is done visually without shifting layouts via expanding button sizes to `44px` while using offset negative margins to keep the element visually aligned with design.

---

## 5. Triple-Tap to Delete
- **File:** `src/components/CalendarViews.tsx`
- **Component / Location:** `DraggableTaskBlock` -> `handleUnifiedTap` (lines 1602–1623)
- **Exact Function Code:**
  ```tsx
  const handleUnifiedTap = (isTitle: boolean) => {
    if (moved.current) return;
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    addDebug(`tap=${tapCount.current} title=${isTitle}`);
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      addDebug(`DELETE ${task.title}`);
      if (navigator.vibrate) {
        navigator.vibrate([30, 40, 30]);
      }
      deleteTask(task.id);
      return;
    }
    tapTimer.current = setTimeout(() => {
      if (tapCount.current === 1 && isTitle) {
        addDebug(`EDIT ${task.title}`);
        onEditOpen(task);
      }
      tapCount.current = 0;
    }, 350);
  };
  ```
- **Why it is load-bearing (WHY it exists):**
  - Provides a quick, swipe-free deletion shortcut directly from the timeline task block. Debouncing taps over `350ms` ensures a double-tap is not mistaken for a deletion gesture.

---

## 6. Subtask Drag Reorder
- **File:** `src/components/TaskSheet.tsx` (around lines 580–750 inside the subtasks block list)
- **Component:** Uses `@dnd-kit/core` with `DndContext`, `SortableContext`, and a custom sortable subtask item wrapper.
- **Why it is load-bearing (WHY it exists):**
  - Uses vertical-only modifiers (`restrictToVerticalAxis`, `restrictToParentElement`) to prevent subtask list elements from drifting horizontally during sorting on cramped mobile viewports, providing a stable, fluid touch-drag interaction.

---

## 7. Task Creation Default Time Stacking
- **File:** `src/components/TaskSheet.tsx`
- **Exact Function:** `getDefaultTime`
- **Exact Code:**
  ```tsx
  const getDefaultTime = (): string => {
    const allTasks = useTaskStore.getState().tasks;
    const targetDate = date || formatDate(new Date());
    const sameDayTasks = allTasks.filter((t) => t.date === targetDate);

    if (sameDayTasks.length === 0) {
      // First task of the day — use current time snapped to 15 min
      const now = new Date();
      const m = Math.round(now.getMinutes() / 15) * 15;
      const d = new Date(now);
      if (m >= 60) {
        d.setHours(d.getHours() + 1);
        d.setMinutes(0);
      } else {
        d.setMinutes(m);
      }
      return formatTime(d);
    }

    // Find the latest task time on this day, place new one 60 min below
    const latestMins = sameDayTasks.reduce((max, t) => {
      const [h, mm] = (t.time || '00:00').split(':').map(Number);
      return Math.max(max, h * 60 + mm);
    }, 0);
    const newMins = Math.min(latestMins + 60, 23 * 60 + 30);
    const h = Math.floor(newMins / 60).toString().padStart(2, '0');
    const m2 = (newMins % 60).toString().padStart(2, '0');
    return `${h}:${m2}`;
  };
  ```
- **Why it is load-bearing (WHY it exists):**
  - When creating tasks without an explicit time, this ensures tasks are placed sequentially down the timeline 60 minutes apart (stacked vertically and at full width) rather than sitting side-by-side at the same time. The first task of the day still snaps to the nearest 15 minutes of the current time.

---

## 8. Edit Keeps Original Time (Sync Effect)
- **File:** `src/components/TaskSheet.tsx`
- **Exact Function/Effect:** `useEffect`
- **Exact Code:**
  ```tsx
  useEffect(() => {
    if (activeIsOpen) {
      if (activeMode === 'edit' && activeEditTask) {
        setTitle(activeEditTask.title || '');
        setCategory(activeEditTask.category || 'Work');
        setDate(activeEditTask.date || '');
        setTime(activeEditTask.time || ''); // CRITICAL — load existing time
        setSubtasks((activeEditTask.subtasks || []).map(({ id, title }) => ({ id, title })));
      } else {
        ...
  ```
- **Why it is load-bearing (WHY it exists):**
  - Pre-populates the existing task's timestamp into the edit form state. Without setting the `time` state to `activeEditTask.time`, the form's default fallback logic would override it, causing editing a task to automatically move it to the current clock time.

---

## 9. Fixed Task Sheet Layout (Save Button Stays Visible on Android)
- **File:** `src/components/TaskSheet.tsx`
- **Location:** Sheet layout styling (lines 511–530)
- **Exact style values:**
  ```tsx
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  top: '15%', // sheet starts 15% from top, fixed to bottom
  maxHeight: 'none',
  height: 'auto', // let top/bottom define height, not vh
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',
  borderRadius: '24px 24px 0 0',
  zIndex: 2000,
  ```
- **Why it is load-bearing (WHY it exists):**
  - **The Issue:** On Android, opening the virtual keyboard would compress viewports or cover sheet elements, pushing input boxes or the "Save" action buttons completely off-screen.
  - **Viewport Meta:** The `index.html` has `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content">` which instructs the browser to shrink the layout viewport when the virtual keyboard rises.
  - **Fixed Boundary:** Styling with `position: 'fixed'`, `top: '15%'`, and `bottom: 0` instructs the element to adapt seamlessly to the shrunk viewport.
  - **Scroll Isolation:** Setting the inner container to `flex-1 overflow-y-auto min-h-0` locks the scrollable area while leaving the Save button container styled as an unshrinkable sibling, keeping it visible above the keyboard at all times.

---

## 10. Category Filtering
- **File:** `src/components/CategoryTabBar.tsx`
- **Why it is load-bearing (WHY it exists):**
  - Synchronizes selected filters with state using `useTaskStore`. Implements dynamic slide transitions measuring element offsets and widths, giving users fluid navigation feedback.

---

## 11. Timeline Column Layout (Overlapped Cluster Calculations)
- **File:** `src/components/CalendarViews.tsx`
- **Exact Function:** `layoutTasks` (lines 2048–2106)
- **Why it is load-bearing (WHY it exists):**
  - Groups task items that overlap within a shared hour slot into clusters, then greedily distributes them across sub-columns. Determines `blockWidth = 100 / totalColumns` and left offset multipliers, ensuring overlapping tasks remain completely readable and do not visually mask one another.
