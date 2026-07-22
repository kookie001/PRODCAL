# Bug Tracker

## Open Bugs

*(No known open bugs in the current frozen state.)*

## Resolved Bugs

- **BUG 38: Tapping a pending card's title opens the edit sheet blank**
  - *Description:* Clicking or tapping on the title of a task in the "My Tasks/Pending" list opened the edit sheet completely empty instead of loaded with that task's existing data (title, subtasks, category, date, all-day status).
  - *Root Cause:*
    1. Clicking the card triggered `handleRowClick` on the outer card wrapper. If the task had incomplete subtasks, the click was intercepted to toggle the subtasks expanded state, which completely bypassed opening the edit sheet.
    2. Tapping the title was not separated from the outer row click, resulting in a conflict between expanding subtasks and opening the edit sheet.
  - *Resolution:* Added an explicit `onClick` handler directly to the title `<p>` tag in `TaskItemRow` with `e.stopPropagation()`. This immediately dispatches `setEditingTask(task)` with the complete task object when the title is clicked. Restructured `handleRowClick` on the card body to only expand the subtasks, completely and cleanly separating the two interactions.

- **BUG 39: Dragging a pending task onto the timeline assigns a drop-position time instead of making it an All-day task**
  - *Description:* When a pending task was dragged onto the daily timeline, its time was computed based on the vertical drop position, which scheduled it at a random hourly slot instead of as an All-day task.
  - *Root Cause:* The drop handler inside `handleGlobalTouchEnd` computed `h` and `m` based on the touch Y-coordinate and passed them as the `time` parameter to the store's `updateTask` action.
  - *Resolution:* Updated the `updateTask` call in the drop handler in `TasksOverlay.tsx` to set `time: ''`, which flags it as an All-day task on the timeline for that day while ignoring the vertical Y-coordinate.

- **BUG 37: Dragging a category tile horizontally beyond viewport bounds shifts the entire page sideways**
  - *Description:* When dragging a category tab tile left or right, if the cursor/active overlay moves past the edges of the screen, the entire web page/viewport shifts sideways, leaving an empty white gap on the right and pushing main components off-screen.
  - *Root Cause:*
    1. Absolute/fixed positioning of dnd-kit's `DragOverlay` elements extends the scrollable document size when positioned off-screen, prompting the browser to expand the horizontal body bounds.
    2. Lack of horizontal layout constraint boundary modifiers on `DndContext` and `DragOverlay` allowed drag previews to wander outside the category tab bar.
  - *Resolution:*
    1. Added the `restrictToParentElement` modifier to BOTH `DndContext` and `DragOverlay` to clamp drag coordinates within the category tab bar container's bounds.
    2. Enforced `overflow-x: hidden` globally on `body` and `#root` elements to prevent horizontal scroll layout thrashing during any custom dragging operations.

- **BUG 36: Replace long-press category reorder with a reliable drag-handle approach to completely eliminate horizontal scroll/tap conflicts**
  - *Description:* Long-press delays are inherently sensitive and conflict with native horizontal scrolling (making scroll sensitive or breaking reorder completely).
  - *Root Cause:* Implementing horizontal list sorting alongside a horizontal scrolling scrollbar container using timing-based long-press gestures causes a clash. The browser cannot differentiate a scroll swipe from a touch-drag start without awkward delay configurations.
  - *Resolution:*
    1. Replaced the delay-based sensor constraints with a dedicated, highly polished drag handle (grip icon ⣿, using Lucide `GripVertical`) embedded inside each category tile.
    2. Bound dnd-kit's drag listeners and attributes (`attributes` and `listeners` from `useSortable`) **only** to the grip handle element.
    3. Left the main body of the tile with its normal click listener (`onClick`) for tap-to-filter category selection.
    4. By isolating these three distinct interaction zones (scroll = tile body swipe, tap = tile click, drag = grip handle press/drag), all three gestures now coexist flawlessly with absolute reliability and zero conflict.
    5. Cleaned up and simplified the `PointerSensor` and `TouchSensor` configurations by completely removing activation delays.

- **BUG 35: Category tab bar horizontal scroll vs horizontal drag-reorder gesture conflict**
  - *Description:* On mobile/touch devices, fixing horizontal scroll (BUG 33) broke long-press drag-to-reorder, and vice-versa. Quick swipes and deliberate hold-to-drag gestures were not correctly distinguished because of sub-optimal sensor constraints and a lack of explicit `touchAction` styles.
  - *Root Cause:*
    1. The `TouchSensor` was configured with a long 400ms delay and low 5px tolerance, meaning tiny natural finger tremors during the hold cancelled drag activation.
    2. The `PointerSensor` also had a 400ms delay, making desktop mouse reordering feel sluggish/broken instead of initiating instantly.
    3. The individual category buttons did not have an explicit `touchAction: 'pan-x'` CSS styling, which meant the browser could start a native scroll gesture before the sensor's activation delay resolved, preventing dnd-kit from taking over.
  - *Resolution:*
    1. Configured the `TouchSensor` with a responsive 250ms activation delay and an increased 8px tolerance. This allows quick horizontal swipes to natively scroll the tab bar, while a 250ms hold reliably initiates a drag.
    2. Switched the desktop `PointerSensor` to use a 8px distance activation constraint instead of a delay, providing instant "grab and drag" responsiveness for mouse users.
    3. Added `touchAction: 'pan-x'` to the style of the individual sortable category buttons. This explicitly instructs the browser to allow horizontal scrolling normally when swiped, but permits the TouchSensor to call `preventDefault()` and cancel scroll once a drag starts.

- **BUG 33: Category tab bar horizontal scroll locked/broken after implementing drag reordering**
  - *Description:* Users could no longer horizontally scroll/swipe the category tab bar on touch devices or desktops to view off-screen categories.
  - *Root Cause:* The sortable category tab buttons were statically styled with the Tailwind class `touch-none`. Since these buttons spanned almost the entire width of the scrollable container, they intercepted and completely suppressed browser-level horizontal touch gestures, disabling native scrolling.
  - *Resolution:* Removed `touch-none` from the sortable tab buttons. Browser-level horizontal scroll gestures are now fully permitted unless a 400ms sustained long-press initiates active dragging (which programmatically cancels scroll via dnd-kit's TouchSensor).

- **BUG 34: Category tab drag-to-reorder motion feels janky and lags behind pointer/finger**
  - *Description:* Category tab movement was slow, stuttered, and lacked the premium fluid feel of vertical task card reordering.
  - *Root Cause:* Draggable tab buttons had the Tailwind class `transition-all duration-200` which conflicts with dnd-kit's high-frequency inline `transform` styling. The browser tried to interpolate/transition every single frame-level inline transform update, causing extreme lag.
  - *Resolution:* Replaced `transition-all` with `transition-colors` on draggable buttons. This preserves smooth background/color transitions when active selections change, but leaves inline `transform` values entirely uninhibited, making the horizontal reorder movement perfectly smooth and responsive.

- **BUG 32: Task card reordering on home Day view drifts horizontally on real touch devices**
  - *Description:* Dragged task cards still move horizontally following the finger/mouse, even though `restrictToVerticalAxis` was added to the list's `DndContext`.
  - *Root Cause:* Conflict with a legacy custom drag-to-category implementation that manually performed DOM-level transform style operations (`blockRef.current.style.transform = ...`) in its touch/mouse event listeners. This direct manipulation overrode and fought with dnd-kit's react-state transforms.
  - *Resolution:* Removed the manual visual transform style modifications from the legacy move listeners, transferring full coordinate translation and bounds control exclusively to dnd-kit's `useSortable` and the vertical-axis/parent-container modifiers. Left pointer tracking/coordinates caching intact for drag-to-category hover assignment.

- **BUG 31: Add drag-to-reorder for Category Tabs (dnd-kit Sortable)**
  - *Description:* Category tabs could not be reordered or sorted, limiting users from prioritizing custom list views.
  - *Root Cause:* There was no sorting or ordering model implemented for categories, and the `CategoryTabBar` rendered categories in a static pre-defined list.
  - *Resolution:* Implemented a dnd-kit `DndContext` and `SortableContext` wrapping all category tabs, configured with a horizontal list strategy and pointer/touch sensors with activation constraints (delay: 400ms, tolerance: 5px) to safely separate regular tab tapping from sustained long-press sorting gestures. Added and persisted `categoryOrder` in the Zustand task store.

- **BUG 30: Task cards on home Day view wobble horizontally during vertical drag-to-reorder**
  - *Description:* When dragging a task card to reorder items in the home Day view list, the card would drift horizontally (left/right) with the pointer/finger, resulting in an unpolished feel.
  - *Root Cause:* The dnd-kit `DndContext` wrapping the home list did not enforce strict vertical axis constraints on the active draggable item.
  - *Resolution:* Configured the home list's `DndContext` modifiers array with both `restrictToVerticalAxis` and `restrictToParentElement` from `@dnd-kit/modifiers` to strictly lock dragging movement to the vertical Y-axis and prevent the card from escaping the container's bounds.

- **BUG 29: Remove drop diagnostics panel and ghost preview during pending-to-timeline drag**
  - *Description:* The DROP DIAGNOSTICS panel shown at the bottom of the screen upon dropping and the faint background ghost/faded duplicate of the pending task list during drag were visual clutter.
  - *Root Cause:* The diagnostic readout overlay was left enabled after debugging drop behaviors, and the container's opacity was set to `opacity-15` during active drag, allowing the faded pending items to still show through behind the floating dragged card.
  - *Resolution:* Removed the on-screen rendering of the `DROP DIAGNOSTICS` panel from `TasksOverlay.tsx`. Changed the background pending task container opacity to `opacity-0` when `draggedTask` is active, completely hiding the faded items so that only the floating dragged card is visible over the clean timeline background.

- **BUG 28: Add dnd-kit drag-to-reorder on home Day view with manualOrder**
  - *Description:* Task cards on the home Day view did not support drag-to-reorder, and order was purely determined by scheduled time, restricting manual sorting.
  - *Root Cause:* Task cards on the home Day view lacked a `manualOrder` field and dnd-kit sortable wrappers, preventing users from reordering tasks within the list vertically with fluid transitions and magnetic settle animations.
  - *Resolution:* Added `manualOrder?: number` to the `Task` type and store. Implemented store-persisted `reorderTasks` action. Updated `addTask` to place new tasks at the end of the day list (`maxOrder + 1`). Wrapped the home DayView task list in dnd-kit `DndContext` and `SortableContext` with pointer/touch sensors, touch delay, and vertical restrictor. Integrated the `useSortable` hook with combined refs into `DraggableTaskBlock` to support vertical drag gap animations and magnetic settling.

- **BUG 26: Stale-render bug when dropping a timeline task card onto the "Pending" category tab/tile**
  - *Description:* Dropping a task onto the "Pending" category tab/tile correctly flags the task as pending, but the UI (removing it from today's timeline and adding it to the pending list) does not refresh until the user manually taps or scrolls the screen.
  - *Root Cause:* Prior updates on drop called the generic `updateTask` with a partial object. While functional, the update path did not consistently trigger an immediate, high-priority reactive subscription update across all memoized views for this specific field change, resulting in a stale render until a gesture or interaction forced a re-render.
  - *Resolution:* Added a dedicated, highly optimized, and strictly immutable store action `setTaskPending` that maps over the tasks array and returns a clean, shallow-copied state array, bypassing any scheduling or batching latency and forcing React to refresh the timeline and pending list immediately upon drop with zero manual interaction.

- **BUG 27: Missing drag-and-drop hover feedback and color-matching glow on category tabs**
  - *Description:* When dragging a task card towards the category bar at the top, the hovered category tab only highlighted in a generic blue color, failing to use that category's own thematic color and lacking a polished visual glow.
  - *Root Cause:* The `updateTabHighlights` utility had a hardcoded background color (`rgba(26, 115, 232, 0.15)`) and didn't read dynamic category color mappings from the store.
  - *Resolution:* Refactored `updateTabHighlights` to query the dynamic category configurations from the store and identify the hovered tab's actual category color. Implemented a sleek, layout-honest visual styling: when hovered during drag, the tab glows with a 3px ring in its own category color (`boxShadow: 0 0 0 3px <categoryColor>44`), its border highlights in its thematic color, and its background applies a smooth, semi-transparent 10% color tint, all powered by lightweight transform transitions (`transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1)`) for premium, lag-free micro-interactions.

- **BUG 25: Stale-render bug on rescheduling a past task from the pending list onto the current-day timeline**
  - *Description:* Dragging a past task (e.g. 14 July) from the pending list onto today's timeline correctly updated its date in the data, but it did not appear on today's timeline until the user tapped or scrolled the screen.
  - *Root Cause:* When dropping the task from the pending list onto the timeline, the drop handler in `TasksOverlay.tsx` updated the task's date and time, but failed to set `isPending` to `false`. Since `isPending` remained `true` and the date was set to today's date (`todayStr`), the task met the condition `task.isPending && task.date === todayStr` inside the DayView's `dayTasks` filter, causing it to be filtered out of the hourly timeline list and fail to render until some action triggered a change.
  - *Resolution:* Added `isPending: false` to the task properties during the drop update in `TasksOverlay.tsx`, instantly and correctly marking the task as no longer pending when scheduled on the timeline. This removes it from the pending list and displays it on the timeline immediately.

- **BUG 24: Stale-render bug when dragging a timeline task card to the "Pending" category tab**
  - *Description:* Dragging a task (e.g., 20 July) into pending made it disappear from the timeline momentarily, but then it re-appeared when the user tapped the screen.
  - *Root Cause:* Dropping a task onto the "Pending" category pill set `isPending: true`. However, the DayView's `dayTasks` filter only excluded pending tasks if their date matched today's date (`if (task.isPending && task.date === todayStr) return false;`). For tasks on other dates (e.g., 20 July when today was 19 July), the task was not excluded, meaning it remained scheduled on the 20 July hourly timeline. Once the gesture ended and the dragging state reset, the task re-appeared on the 20 July timeline.
  - *Resolution:* Simplified the DayView `dayTasks` filter to unconditionally exclude all pending tasks (where `task.isPending` is `true`) regardless of the date, ensuring they leave the hourly timeline instantly and permanently as soon as they are flagged as pending.

- **BUG 23: Date and time pickers (CalendarPicker & ClockPicker) stopped opening when tapped inside TaskSheet**
  - *Description:* Tapping the date row or time row inside the "More options" section of `TaskSheet` did not open the calendar or clock pickers.
  - *Root Cause:* The `<form>` container in `TaskSheet.tsx` had `onFocus={handleFocus}` which set `keyboardOpen(true)`. When the user tapped any button in the form, such as the date row button or time row button, that button received focus, triggering the form's `onFocus` event due to bubbling. This set `keyboardOpen` to `true`, instantly switching the UI to the keyboard toolbar and unmounting the options drawer buttons, preventing the click from opening the pickers.
  - *Resolution:* Updated `handleFocus` in `TaskSheet.tsx` to check the tag name of the focused target. It now only sets `keyboardOpen` to `true` if the target is an `INPUT` or `TEXTAREA`. Focusing buttons (such as options, dates, or category buttons) no longer triggers `keyboardOpen(true)`, keeping the pickers fully active and responsive.

- **BUG 22: Redesign Day View timeline to list layout, remove vertical reschedule-drag, keep category-drag**
  - *Description:* Visual timeline grid (vertical hours and background horizontal lines) took up too much vertical space and made viewing scheduled tasks cluttered. Drag-to-reschedule vertically on a absolute-positioned grid was error-prone and caused accidental timeline changes.
  - *Root Cause:* The Day view was structured around a fixed 24-hour vertical grid using absolute positioning based on hour pixel-offsets.
  - *Resolution:* Completely removed the 24-hour visual timeline grid, hour labels, and grid lines. Converted the Day view to a sleek, time-ordered, vertical flex list where scheduled tasks are sorted ascending by time (All-Day tasks first, followed by earliest to latest). Redesigned the task cards to be larger and spacious, formatting them horizontally as `[time] | (V chevron) title | pencil | completion-circle`. Removed vertical drag-to-reschedule logic. Refactored touch and mouse drag-to-category handlers to use responsive 2D translation transforms (`transform: translate(dx, dy)`) for high-fidelity visual feedback, allowing users to drag cards over category tabs to update categories while cleanly preventing accidental vertical rescheduling.

- **BUG 21: Critical regression: back button exits app instead of closing task sheet on second press**
  - *Description:* When the task edit or create sheet is open, pressing the back button/gesture once closes the keyboard/blurs input. Pressing back a second time causes the entire app to exit/go home, instead of closing the task sheet.
  - *Root Cause:* Prior implementations had multiple competing `popstate` listeners and history pushes/pops scattered between `App.tsx` and `TaskSheet.tsx`. These listeners raced, causing the history stack to get out of sync, corrupted, or completely drained. This allowed the browser's default action to escape, causing the app to exit on the second back press.
  - *Resolution:* Simplified the entire architecture by making the global handler in `App.tsx` the sole coordinator for the back button and history stack. All local `popstate` handlers and manual history pushes/pops were removed from `TaskSheet.tsx`. When the sheet is open, the global handler in `App.tsx` intercepts the back gesture, dispatches a `'task-sheet-back-press'` custom event to close the sheet immediately in one press, prevents default behavior, and re-arms the single dummy state. This keeps the history stack perfectly balanced, clean, and in sync. Removed the on-screen chevron close button entirely from the header per user request, and disabled backdrop/handlebar close to avoid accidental dismissals, leaving save and OS Back as the exclusive sheet close triggers. Added an on-screen `sheetOpen` dynamic status text indicator at the top of the mock viewport for live diagnostics on physical devices.

- **BUG 20: Chevron button and subtasks visibility broken/stuck after dragging a timeline task card**
  - *Description:* Tapping the chevron button after dragging a task card and dropping it (normal reschedule or drag-to-category) does nothing, and the subtasks are not shown.
  - *Root Cause:* When a drag gesture is ended and the task's time or category is updated in the store, React's batching of state updates causes the component to re-render in response to parent prop changes *before* the asynchronous local state update `setIsActivelyDragging(false)` is fully processed. Because `isActivelyDragging` is still evaluated as `true` during the initial re-render, the card renders in its active dragging state (collapsing subtasks and locking the chevron).
  - *Resolution:* Linked the visual rendering of the active drag state to the synchronous `dragging.current` ref by creating `isCurrentlyDragging = isActivelyDragging && dragging.current`. Since `dragging.current` is reset to `false` completely synchronously in `resetDragState` immediately when the touch/mouse gesture terminates, `isCurrentlyDragging` is guaranteed to be `false` in any and all subsequent render cycles, instantly and robustly re-enabling the expand/collapse chevron button and displaying subtasks cleanly.

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
