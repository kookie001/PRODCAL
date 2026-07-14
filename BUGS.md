# Bug Tracker

## Open Bugs

*(No known open bugs in the current frozen state.)*

## Resolved Bugs

- **BUG 19: Vertical spacing/gap between subtask rows in the expanded pending list card is too large**
  - *Description:* When a pending task card is tapped to expand its subtasks, the vertical gap between subtask rows is too large.
  - *Root Cause:* The subtask circle check button wrapper was hardcoded with a height of `28px` inside a flex layout container with additional padding, forcing the row to be extremely tall.
  - *Resolution:* Reduced the wrapper button height to `18px` inside `SortableSubtaskItem`, decreasing the entire row's vertical height and letting the subtasks sit tightly closer together (~4-6px spacing).

- **BUG 18: Gesture conflict on pending card body between tap-to-expand, long-press-drag, and subtask reordering**
  - *Description:* Introducing card body tap-to-expand alongside touch long-press-to-drag and subtask drag-reordering creates potential touch overlap and bubbling issues.
  - *Root Cause:* Touch move, drag-and-drop sensors, and taps bubble up and can trigger parent elements or trigger false drags.
  - *Resolution:* Removed the chevron button entirely. Implemented a dual-state click handler on the card body: if a task has incomplete subtasks, short tap toggles expansion; if no subtasks are present, short tap opens the edit modal. Long press is handled cleanly by the existing timer and `preventClickRef` guard which blocks click events upon touch drag completion. Subtask dragging is isolated within its own nested dnd-kit context with touch/pointer sensors using a custom delay configuration, and all subtask and parent completion checkboxes are completely insulated with `stopPropagation()` on touchstart, mousedown, and click.

- **BUG 17: Usability conflict between pending card's long-press-to-drag and new chevron/subtask click handlers**
  - *Description:* Introducing a chevron expand button and subtask completion circles on the pending card could cause clicks or touches on these child elements to inadvertently trigger the card's long-press drag-to-timeline timer, or trigger details-modal clicks.
  - *Root Cause:* Touch/mouse events on child buttons bubble up to the main row container's `onTouchStart` and `onClick` handlers.
  - *Resolution:* Implemented absolute event isolation on the chevron button and subtask circles. Added both `e.stopPropagation()` and `e.preventDefault()` on `onTouchStart`, `onTouchEnd`, `onMouseDown`, `onMouseUp`, and `onClick` handlers for these elements. Furthermore, restructured the card container to place subtasks in a sibling panel beneath the main clickable card row, ensuring that long-press-drag listeners are strictly bound to the card row, completely insulating subtask interactions.

- **BUG 16: Selected AM/PM time picker buttons are low contrast and hard to see**
  - *Description:* The selected AM or PM button in the ClockPicker had low contrast (only a faint tint), making it difficult to instantly identify which state was active.
  - *Root Cause:* The style was relying on a light background color without a distinct border highlight or high-contrast foreground color.
  - *Resolution:* Configured the selected AM/PM state to use a bold solid black border (`2px solid #000000`), a distinct light green background (`#E6F4EA`), and highly readable dark green text (`#137333`) while preserving muted defaults for the unselected states.

- **BUG 15: Pending/My Tasks list shows today's tasks and fails to rollover incomplete tasks automatically**
  - *Description:* Today's tasks were showing up in both the timeline and the Pending list, which cluttered the list. Additionally, when the date rolled over to the next day at midnight, today's incomplete tasks did not move to the pending list without a manual page refresh.
  - *Root Cause:* The pending list filter was checking `!task.completed` without excluding today's tasks. The list did not listen to visibility changes or use a background timer to recompute "today" dynamically.
  - *Resolution:* Filtered out today's tasks using `task.date !== todayStr` where `todayStr` is a synchronized React state of the current date in `'yyyy-MM-dd'` format. Implemented dynamic today-date recomputation on mount, on app visibility/focus regain, and on a 30-second periodic background interval. Yesterday's incomplete tasks now rollover to the Pending/My Tasks list instantly and automatically at midnight.

- **BUG 12: Android back button closes the app instead of closing the task sheet**
  - *Description:* Pressing the physical Android back button while the task create/edit sheet was open closed the entire app instead of closing only the sheet.
  - *Root Cause:* Programmatic `.click()` triggers on the backdrop element failed or was bypassed, causing the back button popstate interceptor to fall through.
  - *Resolution:* Promoted the task sheet open check to the highest priority, and directly close the sheet using real Zustand store state actions (`setFABOpen(false)`, etc.) instead of DOM click hacks, preventing fall-through completely.

- **BUG 13: Chevron button appears on task cards with no subtasks**
  - *Description:* The expand/collapse chevron button rendered on all task cards, even when the task had zero subtasks or only completed subtasks (leaving an empty dropdown/gap).
  - *Root Cause:* The chevron button rendering was guarded only by `task.subtasks.length > 0` instead of checking for active/incomplete subtasks.
  - *Resolution:* Updated the guard condition to `task.subtasks.filter(s => !s.completed).length > 0`. Tasks with no incomplete subtasks now show absolutely no chevron or empty gap, and their titles cleanly fill the card.

- **BUG 14: Search filters the timeline in-place instead of showing navigatable results**
  - *Description:* Typing in the search bar filtered tasks in-place on the timeline, hiding non-matching entries.
  - *Root Cause:* The search bar was coupled directly to the timeline filter instead of generating a navigatable list of results.
  - *Resolution:* Removed search query filtering from the timeline completely. Built a floating search results dropdown under the header search bar which searches across all dates. Tapping a result navigates directly to that task's date, sets the Day view active, and scrolls the timeline smoothly to the task's hour.

- **BUG 10: Header search input does not filter tasks in real-time**
  - *Description:* Typing in the header search bar did not filter the tasks displayed on the Day view timeline or the Pending/My Tasks list.
  - *Root Cause:* The header search input was not fully wired to a common, synchronized search state that is consumed by both the timeline views (`CalendarViews.tsx`) and the tasks list overlay drawer (`TasksOverlay.tsx`).
  - *Resolution:* Linked the header input's search query to a unified `searchQuery` state in `App.tsx` and passed it down to both `CalendarViews` and `TasksOverlay`. Both views now filter tasks in real-time (case-insensitive title and subtask match) as the user types, and added a small clear (×) button to the search input.

- **BUG 11: Android back button closes the entire app instead of closing open overlays or pickers**
  - *Description:* Pressing the physical Android back button while the task sheet, a date/time picker, the sidebar drawer, or the My Tasks overlay was open would close the entire app.
  - *Root Cause:* The event handler in `App.tsx` did not prevent default or push state when overlays were open. It lacked a structured, priority-based state checking mechanism to close the open overlay instead of falling through to app exit.
  - *Resolution:* Implemented a clean, priority-ordered popstate back-button interceptor using refs to avoid stale react closures. The interceptor programmatically clicks the close/backdrop elements of active pickers, the task sheet, the sidebar, the Pending/My Tasks list, and clears active search queries. The app is only allowed to exit (with a double-tap 2s timeout toast) when no overlays or pickers are open.

- **BUG 8: Task completion circle overlaps title/chevron or is too sensitive**
  - *Description:* Tapping near the completion circle could accidentally trigger details modal/edit view or expand/collapse chevrons, or tap nearby space to toggle task completion.
  - *Root Cause:* The completion `<button>` element previously had a broad hit box with either negative margins or excessive padding.
  - *Resolution:* Resized the button layout footprint to a precise `26px` with `margin: 0` tight around the `18px` visible circle (26px tap target for a ~18px visible circle). Added `e.preventDefault()` to pointer/touch/mouse start handlers, along with `e.stopPropagation()`, ensuring that clicking anywhere outside the small circle does nothing.

- **BUG 9: Completed subtasks vanish without being displayed anywhere else**
  - *Description:* Completed subtasks disappeared from the task card's subtasks list, but did not appear anywhere else, making them invisible and impossible to view or revert.
  - *Root Cause:* The subtask list in the card filtered out completed items, but the Completed tasks list only filter task level items.
  - *Resolution:* Retained the filtration on the task card while routing completed subtasks into the exact same "Completed" tasks section within the `TasksOverlay`. Displayed completed subtasks with standard muted strikethrough styling and parent task names for context, supporting toggling back to incomplete and deletion.

- **BUG 7: Chevron button / subtask visibility broken after dragging a task card**
  - *Description:* Tapping the chevron button after dragging a task card did nothing or failed to show/hide subtasks.
  - *Root Cause:*
    1. During a drag, the auto-collapse logic previously called `setExpanded(false)`, permanently destroying the expanded state. (Fixed in previous commit).
    2. React synthetic `onTouchEnd` events on the task block card do not fire if the touch originates on child text nodes (like `<p>` of task title) that stop propagation inside their own touch handlers (e.g., to prevent double tap/clicking). Because propagation was stopped, `resetDragState` was skipped, leaving `dragging.current`, `moved.current`, and `isActivelyDragging` permanently stuck as `true` after a drop. This in turn blocked subtask rendering and locked the container zIndex at 250.
  - *Resolution:*
    1. Removed permanent `setExpanded(false)` from dragging code. Instead, made collapse-during-drag a visual-only state check (`expanded && !isActivelyDragging` inside render). This preserves the `expanded` state so subtasks automatically reappear when the drag ends.
    2. Implemented native window `touchend` and `touchcancel` event listeners registered dynamically inside `handleTouchStart` to guarantee cleanup of drag/touch states even when child components stop propagation.
    3. Expanded `resetDragState` to clean up `dragging.current`, `moved.current`, `isActivelyDragging`, and `isDraggingSubtask` unconditionally.
    4. Simplified the chevron's handlers to be purely unguarded toggles that propagate stop/prevent defaults cleanly.

- **BUG 5: Date/Time Pickers render blank or are clipped/not shown**
  - *Description:* Clicking on the date or time inside the task creation page resulted in nothing showing up or appearing blank/invisible.
  - *Root Cause:* Position absolute/fixed picker overlays were being clipped or hidden by container-level parent layouts, overflow rules, or translation transformations.
  - *Resolution:* Wrapped both `<CalendarPicker />` and `<ClockPicker />` overlays in React's `createPortal(..., document.body)` so they render directly at the body root, bypassing any local clipping, scrolling, or container-transform issues.

- **BUG 6: All-Day toggle defaults to ON, placing new tasks at the top instead of the current timeline slot**
  - *Description:* New tasks were defaulted to "All-day" and placed at the top of the timeline by default.
  - *Root Cause:* The `isAllDay` state was initialized to `!prefilledTime`. When creating a new task from the FAB, `prefilledTime` was empty, causing `isAllDay` to default to `true` (ON).
  - *Resolution:* Initialized `isAllDay` to `false` by default on task creation, and pre-filled the `time` field with the current time snapped to the nearest 15 minutes if no other prefilled time is provided, ensuring tasks land on the current time slot on the timeline.

- **BUG 1: Save button disappearing / covered by keyboard on Android**
  - *Description:* On Android, opening the virtual keyboard covered the input fields and action buttons (like the Save button) of the task creation/editing sheet.
  - *Root Cause:* The viewport height was treated as fixed, and standard virtual keyboard behaviors overlay the page rather than resizing it unless specified.
  - *Resolution:* Implemented `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content">` to force the OS virtual keyboard to resize the viewport layout. Styled the sheet with fixed top/bottom positioning (`position: 'fixed'`, `top: '15%'`, `bottom: 0`) and used `min-h-0` + `overflow-y-auto` on the list container to keep header/footer elements anchored.

- **BUG 2: Editing a task MOVES it to a different time**
  - *Description:* When a task was opened in the Edit sheet and subsequently saved (or closed), it would jump to a different slot on the timeline or use a default creation time.
  - *Root Cause:* The edit sheet's load effect was not initializing the task's existing time into state (`setTime(activeEditTask.time || '')`), causing the state to remain empty and prompting `getDefaultTime()` to generate a new current time slot upon saving.
  - *Resolution:* Added `setTime(activeEditTask.time || '')` inside the edit sync `useEffect` block of `TaskSheet.tsx` and protected saving logic to preserve `activeEditTask.time` unless explicitly edited.

- **BUG 3: Ghost double-click / tap overlap on timeline task cards**
  - *Description:* Tapping once on mobile could register twice (ghost click triggers), or dragging tasks would trigger a tap-to-edit action when the drag completed.
  - *Root Cause:* Hybrid touch/mouse devices fired both `onTouchEnd` and synthetic `onClick`/`onMouseUp` events, and there was no tracking of active drags to block click triggers on release.
  - *Resolution:* Created a unified tap counter debounced by `350ms` that monitors `moved.current` flags to block clicks after drags, and used `e.preventDefault()` inside `onTouchEnd` to prevent synthetic mouseup events from triggering.

- **BUG 4: Task card width and horizontal overlap columns**
  - *Description:* Overlapping task blocks on the timeline displayed with incorrect column sizes or laid on top of one another, making them illegible.
  - *Root Cause:* Overlapping cards were not clustered and allocated to dynamic layout columns.
  - *Resolution:* Implemented a cluster layout algorithm (`layoutTasks` in `CalendarViews.tsx`) that groups overlapping blocks, determines the greedy maximum overlapping column footprint, and divides width and left offsets proportionally (`100 / totalColumns`).
