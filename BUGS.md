# Bug Tracker

## Open Bugs

*(No known open bugs in the current frozen state.)*

## Resolved Bugs

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
