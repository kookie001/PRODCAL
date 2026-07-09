# Changelog

## [2026-07-09]
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
