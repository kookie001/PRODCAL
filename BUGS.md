# Bug Tracker

## Open Bugs

*(No known open bugs in the current frozen state.)*

## Resolved Bugs

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
