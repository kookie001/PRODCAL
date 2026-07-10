# Changelog

## [2026-07-09]
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
