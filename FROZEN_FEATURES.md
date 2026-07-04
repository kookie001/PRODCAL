# Frozen Features Directory

This file documents all currently functional features of the application, detailing their location, handlers, styles, and crucial load-bearing engineering choices. **Do not modify or refactor these sections without explicit user request.**

---

## 1. Task Card in Timeline (Title Display, Column Layout, Colors)
- **File:** `src/components/CalendarViews.tsx`
- **Component:** `DraggableTaskBlock` (line 1560)
- **Load-bearing Details:**
  - Standard backgrounds and boundaries: Completed card styles get a neutral grey tone (`bg: #F3F4F6`, border: `1px solid #E5E7EB`, text: `line-through` and `color: #9CA3AF`). Active card styles utilize the dynamic blue/accent palette (`bg: #EBF5FF`, border: `1px solid #BFDBFE`, text: `color: #1E40AF`).
  - Height: Minimum height of `44px` ensures compliance with mobile-touch targets.
  - Positioning: `position: absolute` with dynamic `top`, `height`, `left`, and `width` passed from parent, mapped precisely using calculated column layouts inside clusters.

---

## 2. Expand/Collapse Subtasks on Task Card
- **File:** `src/components/CalendarViews.tsx`
- **Component / Function:** `DraggableTaskBlock` (lines 1812–1855)
- **Exact Handler:**
  ```tsx
  <button
    onTouchEnd={(e) => {
      lastTouchTime.current = Date.now()
      e.stopPropagation() // CRITICAL: Prevent card-level tap counter / editor sheet from firing
      e.preventDefault()
      if (!moved.current) setExpanded(p => !p)
    }}
    onMouseUp={(e) => {
      if (Date.now() - lastTouchTime.current < 500) return
      e.stopPropagation() // CRITICAL: Stop event bubbling
      if (!moved.current) setExpanded(p => !p)
    }}
    style={{ ... }}
  >
    {/* chevron svg indicator */}
  </button>
  ```
- **Load-bearing Details:**
  - `e.stopPropagation()` and `e.preventDefault()` are strictly mandatory here to block event bubbling. Without these, tapping the chevron would trigger the parent click listener, which registers a card-level tap and opens the Task Edit Sheet.

---

## 3. Tap Title to Edit Task
- **File:** `src/components/CalendarViews.tsx`
- **Component / Location:** `DraggableTaskBlock` -> Title Paragraph (`<p>` tag inside MAIN ROW, lines 1897–1925)
- **Exact Handlers:**
  ```tsx
  <p
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
    style={{ ... }}
  >
    {task.title}
  </p>
  ```
- **Load-bearing Details:**
  - Prevents double-firing between Touch events and Mouse events on hybrid or pure mobile devices using `e.preventDefault()`. Calls `handleUnifiedTap(true)` which routes to `onEditOpen(task)` on a single click.

---

## 4. Task Complete Circle
- **File:** `src/components/CalendarViews.tsx`
- **Component / Location:** `DraggableTaskBlock` -> Completion Button (`<motion.button>`, lines 1929–1958)
- **Exact Handlers:**
  ```tsx
  <motion.button
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
    whileTap={{ scale: 0.8 }}
    transition={{ type: "spring", stiffness: 500, damping: 15 }}
    style={{ ... }}
  >
    {/* Inner circle or checkmark visual */}
  </motion.button>
  ```
- **Load-bearing Details:**
  - Interactive touch bounds expand using `width: '44px'`, `height: '44px'`, and corresponding negative margins (`marginLeft: '-14px'`, `marginRight: '-14px'`) to satisfy touch target guidelines while aligning a visually small circular checkbox on mobile.

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
- **Load-bearing Details:**
  - Tracks tap increments and resets them on a `350ms` debounced window timer. Triggering the third tap invokes a device haptic vibrate sequence and deletes the task immediately, bypassing normal single tap sheet activations.

---

## 6. Subtask Drag Reorder in Edit Sheet
- **File:** `src/components/TaskSheet.tsx` (around lines 580–750 inside the subtasks block list)
- **Component:** Uses `@dnd-kit/core` with `DndContext`, `SortableContext`, and a draggable/sortable subtask row component.
- **Load-bearing Details:**
  - Implements axis-locked vertical drag modifiers (`restrictToVerticalAxis`, `restrictToParentElement`) to prevent subtask blocks from drifting horizontally during sorting on cramped screens.

---

## 7. Task Creation with Default Current Time
- **File:** `src/components/TaskSheet.tsx`
- **Exact Function:** `getDefaultTime` (lines 423–435)
- **Exact Code:**
  ```tsx
  const getDefaultTime = (): string => {
    const now = new Date();
    const m = Math.round(now.getMinutes() / 15) * 15;
    const d = new Date(now);
    if (m >= 60) {
      d.setHours(d.getHours() + 1);
      d.setMinutes(0);
    } else {
      d.setMinutes(m);
    }
    const result = formatTime(d);
    addDebug(`getDefaultTime = ${result} (current time)`);
    return result;
  };
  ```
- **Load-bearing Details:**
  - Evaluates current system time at the exact moment of saving if no custom value is set in the input field. Rounds to the nearest 15-minute division seamlessly to align clean slot-snap positions on the timeline.

---

## 8. Fixed Task Sheet Layout (Save Button Stays Visible)
- **File:** `src/components/TaskSheet.tsx`
- **Location:** Sheet layout styling (lines 511–530)
- **Load-bearing Details & Exact Style Properties:**
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
  - **Why it works on Android / Mobile:**
    - The `viewport` has `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content">` (ensures OS virtual keyboard resizes the viewport rather than covering the UI).
    - `position: 'fixed'` paired with `top: '15%'` and `bottom: 0` explicitly sets the container boundaries relative to the resized viewport, ensuring the sheet shrinks cleanly.
    - Inside this form, the scrollable list container utilizes `flex-1 overflow-y-auto min-h-0` while the header and action buttons stay locked as non-shrinking flex siblings (`flex-shrink-0`). This guarantees the SAVE button remains pinned above the keyboard and visible at all times.

---

## 9. Category Tab Filtering
- **File:** `src/components/CategoryTabBar.tsx`
- **Details:**
  - Synchronizes selected filters with state using `useTaskStore`. Implements custom indicator sliding animations (`indicatorStyle`) using `offsetLeft` and `clientWidth` measurements to provide highly premium user feedback during tab transitions.

---

## 10. Timeline Column Layout (Overlapped Cluster Calculations)
- **File:** `src/components/CalendarViews.tsx`
- **Exact Function:** `layoutTasks` (lines 2048–2106)
- **Details:**
  - Groups overlapping tasks into distinct clusters (where contiguous tasks overlap within a 60-minute start delta).
  - Within each cluster, columns are computed using a greedy allocation approach checking `timeToMinutes` + duration.
  - Dynamically divides width (`blockWidth = 100 / task.totalColumns`) and offset (`leftOffset = task.column * blockWidth`), ensuring cards do not overflow day boundaries or obscure other cards, while properly filling available column columns.
