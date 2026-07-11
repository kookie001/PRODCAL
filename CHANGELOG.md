# Changelog

## [2026-07-11]
- Highlight selected AM/PM buttons in the ClockPicker with a solid black border (`2px solid #000000`), a light green background (`#E6F4EA`), and dark green text (`#137333`) for maximum contrast and readability, while keeping unselected buttons muted.
- Fix pending task count badge across CalendarViews and Header to exclude today's tasks, matching the filter logic of the Pending list.
- Pending/My Tasks list excludes today's tasks and displays only past-day or future-day incomplete tasks, keeping today's focus entirely on the main timeline.
- Automatically rollover yesterday's incomplete tasks to the pending list at midnight using a synchronized React date state that updates on app focus, mount, and a periodic background timer.
- Fix back button on task sheet: Directly check the sheet's open state as the highest priority and close it using real Zustand store state actions instead of programmatic click tricks.
- Render chevron button in DraggableTaskBlock ONLY when there is at least one incomplete subtask (no chevron and no empty gap on subtask-free tasks).
- Refactor search into a results dropdown: Typing in the search bar displays a dropdown list of matching tasks across all dates, and tapping a result navigates to the task's date and scrolls the timeline to its time.
- Make the header search bar fully functional in real-time for filtering tasks in the active Day view timeline and the Pending/My Tasks list (case-insensitive, matches title and subtasks).
- Implement a smart priority-based physical Android back-button popstate interceptor that closes open pickers, the task sheet, the sidebar, the Pending/My Tasks overlay, and clears active search before exiting the app.
- Restrict completion circle touch target area to a precise 26px (matching a ~18px visible circle), with 0 margin, and keep touchAction 'manipulation' for instant, single-tap response on Android.
- Prevent task completion circle events from propagating and prevent default behavior on pointer down, touch start, mouse down, touch end, and mouse up to isolate interaction entirely to the circle graphic.
- Route completed subtasks from incomplete tasks into the Completed Tasks & Subtasks section of the TasksOverlay, displaying them in a muted strikethrough style with their parent task name as context, while keeping original subtask data intact.
- Hide completed subtasks from the visible subtask list in expanded task views.

## [2026-07-09]
- Stack overlapping timeline tasks vertically instead of side-by-side columns.
- Match pending list card colors only, keeping original size, layout, spacing, and border-radius intact.
- Make Add Subtask and More Options buttons compact and inline-flex inside TaskSheet to save vertical space.
- Add collapsible More Options section for all-day/date/category, default collapsed.
- Fix long-press gesture reliability on touch devices by increasing movement tolerance threshold to 20px.
- Suppress synthetic click/tap and edit-modal opening after completing a pending list task drag-and-drop gesture.
- Sync header date display to show activeDate instead of current real-world date.
- Add clickable "Go to Today" shortcut on the header date to instantly reset view back to today.
- Add smooth horizontal swipe gesture navigation (swipe left for next day, right for previous day) to the DayView timeline background.
- Ensure DayView swipe gestures do not interfere with vertical scrolling or task block/chevron/subtask events.
- Fix chevron button getting permanently stuck after card drag-and-drop.
- Register native `touchend`/`touchcancel` window event listeners during `handleTouchStart` to capture gestures that bypass React synthetic propagation.
- Simplify chevron button toggle handler by removing unnecessary guard logic and double-trigger prevention checks.
- Expand `resetDragState` to unconditionally clean up `dragging.current`, `moved.current`, `isActivelyDragging`, and `isDraggingSubtask`.
- Fix chevron expand/collapse button and subtask visibility getting stuck after dragging a task card.
- Reset card dragging/movement state unconditionally on touch/mouse cancel and end transitions.
- Make collapse-during-drag purely visual and non-destructive to state.
- Prevent event bubbling from chevron button taps to avoid mistaken drag state activations.
- Default All-day toggle to OFF on the new task creation sheet.
- Pre-fill task time field with current time snapped to the nearest 15 minutes.
- Restore fully interactive date and time picker buttons in task sheet (GCAL-style).
- Hide all-day/date/category while typing subtasks, GCAL-style toggle.

## [2026-07-08]
- Auto-collapse expanded task card when dragging starts.
- Fix chevron button logic.
- Set default task creation time to now.
- Diagnose chevron bug with visible debug readout.

## [2026-07-07]
- Refactor stage 1.
- Fix chevron/subtasks after drag (reset drag flag).
