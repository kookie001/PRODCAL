# Changelog

## [2026-07-18]
- Introduce manually flagging tasks as "Pending":
  - Added "Pending" optional boolean field `isPending?: boolean` to the `Task` type in `types.ts`, fully persisted to localStorage via the task store.
  - Rendered a new "Pending" pill chip right after "All" in `CategoryTabBar.tsx` with a warm amber accent, serving as an interactive filter and category drop target.
  - Implemented 2D drag-to-category drop handling for the "Pending" chip: dropping a task onto the "Pending" tile flags the task as `isPending: true` instantly while preserving its original category, date, and times.
  - Excluded today's manually flagged pending tasks from the home timeline/Day view so that they only appear in the pending overlay.
  - Updated the pending list filter (`TasksOverlay.tsx`) to display both past overdue incomplete tasks and any manually flagged `isPending` tasks.
  - Created a priority-based sorting order for the pending list: manually flagged tasks matching today's date are placed at the absolute top of the list, followed by other past overdue tasks sorted descending by date.
  - Adjusted the pending count badges in `Header.tsx` and `CalendarViews.tsx` to utilize the new inclusive pending filter for a consistent and accurate count across the app.

## [2026-07-17]
- Remove temporary debug screen from Edit/create page:
  - Cleaned up the `TaskSheet.tsx` component by removing the temporary red `DEBUG` text block containing state variables (`keyboardOpen`, `moreOptionsOpen`, `showCalendar`, `showClock`) to ensure a production-ready, polished UI interface.
- Fix date/time pickers broken by keyboard toolbar change:
  - Fixed a focus-bubbling bug in `TaskSheet.tsx` where focusing buttons (such as date/time rows, options, or categories) triggered `handleFocus` and unconditionally set `keyboardOpen(true)`.
  - Restricted the form `onFocus` wrapper to only activate `setKeyboardOpen(true)` if the targeted element is a text input or textarea (`INPUT` or `TEXTAREA`).
  - Ensures the calendar and clock picker buttons remain fully responsive and can be clicked to open the pickers in all states without unmounting the options container.
- Add pinned toolbar (Add Subtask + More Options) visible above keyboard while typing:
  - Added a conditional pinned toolbar row in `TaskSheet.tsx` that replaces the regular date/time and category section when `keyboardOpen` is true.
  - The toolbar contains "+ Add Subtask" on the left and "More options ▾" on the right.
  - Clicking "More options ▾" in the toolbar blurs any active input, closes the keyboard, and opens the collapsible options/category drawer.
  - Clicking "+ Add Subtask" correctly adds and focuses a new subtask row.
  - When keyboard is closed, the layout smoothly reverts to showing the "Add subtask" button below the subtasks list and the regular collapsible "More options" section.
- Remove reserved trailing space after separator for tighter card spacing:
  - Removed `minWidth` constraints from the wrapper containing the date/time block and thin separator `|` in both `DraggableTaskBlock` (`CalendarViews.tsx`) and `TaskItemRow` (`TasksOverlay.tsx`).
  - Let this wrapper sit with natural content-hugging width, allowing the date/time text, separator, chevron slot, and title to sit closely together with tight, small, consistent margins.
- Left-align date/time naturally, use trailing-space wrapper technique for title alignment:
  - Replaced the fixed-width box of the date/time text block with a natural content-hugging, left-aligned layout starting flush at the card's left padding (no empty gaps on the left).
  - Wrapped the date/time block and thin separator `|` together inside a custom wrapper element with a consistent `minWidth` of `104px` in both `DraggableTaskBlock` and `TaskItemRow`.
  - Ensures that short times/dates have the separator sitting snugly right next to them with a tight fixed `8px` margin, while any extra unfilled layout buffer naturally flows to the right (before the chevron and title), keeping columns perfectly aligned.
- Right-align date/time text within fixed block to eliminate gap before separator:
  - Switched horizontal alignment of left block content in both `DraggableTaskBlock` (`CalendarViews.tsx`) and `TaskItemRow` (`TasksOverlay.tsx`) from left-aligned (`flex-start` / `items-start`) to right-aligned (`flex-end` / `items-end`).
  - Ensures both short and long date/time strings sit flush against the thin separator `|` with no internal blank gaps, while keeping columns perfectly aligned.
- Standardize card spacing: content-fit block width, identical explicit margins on both cards:
  - Reduced left date/time block width from `88px` to a content-fit `76px` in both `DraggableTaskBlock` (`CalendarViews.tsx`) and `TaskItemRow` (`TasksOverlay.tsx`) to support the longest realistic text length ("18 December") without wrapping or layout wasted space.
  - Removed container flex gaps (`gap: 8px` on Home card) and inconsistent margins (`mr-3` on Pending card).
  - Applied identical explicit marginRight values (`6px`) to the date/time block, thin separator, and chevron slot on both card types.
  - Added consistent explicit spacing (`marginLeft: 8px`) for right-aligned items (pencil edit button, checkbox circle) to ensure absolute alignment symmetry of all columns.
- Redesign category tabs as rounded pill tiles:
  - Transformed flat category tabs with bottom underlines into modern, rounded pill-shaped chip tiles.
  - Set active/selected tabs to show filled background in their respective category colors with white text and a white dot indicator.
  - Formatted unselected tabs with subtle colored borders and light background tints, displaying the custom category dot indicator with elegant dark text.
  - Kept all critical `data-category-tab` data attributes to ensure that hover targets, dragging cache, and filtering work flawlessly.

## [2026-07-16]
- Align card left-blocks to exactly 88px fixed width:
  - Updated both `DraggableTaskBlock` (`CalendarViews.tsx`) and `TaskItemRow` (`TasksOverlay.tsx`) to use a fixed width of 88px for the left date/time block.
  - Ensures the thin separator, chevron slot, and task title always align perfectly at the same horizontal position between cards, and avoids staggered titles on the pending page regardless of date string length.
- Move "+ Add subtask" button to below the subtask list in the task sheet:
  - Repositioned the Add subtask button in `TaskSheet.tsx` to sit directly below the subtask items.
  - Ensures subtask list elements and input fields start typing immediately under the title.
  - Maintained all existing functionalities (add, edit, remove, drag-and-drop sort, auto-scroll, and save interactions).
- Convert home page Day view from visual time-grid to simple time-ordered list:
  - Removed 24-hour vertical timeline grid column, hour labels, and horizontal grid lines completely.
  - Rendered scheduled and all-day tasks as a beautiful, fluid, vertical stacked list ordered ascending by time (All-Day tasks at the very top, followed by 12:00 AM to 11:59 PM).
  - Designed an elegant, high-contrast, larger flex-based task card format: `[time] | (V chevron) title | pencil | completion-circle`.
  - Added empty state handler for days with no tasks.
  - Completely removed vertical drag-to-reschedule logic and visual rescheduling guides.
  - Refactored touch and mouse drag-to-category handlers to use precise 2D translation transforms (`transform: translate(dx, dy)`) for visual feedback, maintaining full drag-to-category capabilities while cleanly avoiding vertical rescheduling.

## [2026-07-15]
- Remove temporary sheetOpen debug badge.
- Simplify task sheet back button and close handling:
  - Removed all local `popstate` listeners, `poppedRef`, and complex history manipulations from `TaskSheet.tsx` to prevent stack corruption and desynchronization.
  - Set `App.tsx`'s global back button handler as the single source of truth for back gesture interception. When the sheet is open (`isTaskSheetOpen || isFABOpen`), pressing OS back dispatches a unified `'task-sheet-back-press'` custom event to the sheet, intercepts the default navigation, and cleanly re-arms the single dummy state.
  - Implemented a subscriber in `TaskSheet.tsx` that listens to `'task-sheet-back-press'` and closes the sheet immediately in a single press (dismissing the keyboard naturally).
  - Completely removed the on-screen close button (chevron icon) from the task sheet's top header so that closing is managed exclusively by the OS hardware back button (with Save still saving + closing).
  - Disabled backdrop and top handlebar click-to-close interactions to prevent accidental sheet dismissals, setting backdrop click to focus-blur any active inputs instead.
- Apply critical mobile performance optimizations:
  - Add a custom memo comparison function for `DraggableTaskBlock` to shallowly compare changing style properties (`top`, `left`, `width`, `height`, `marginTop`, `position`) individually, bypassing re-renders from referentially new inline style objects.
  - Wrap high-level view components (`MonthView`, `WeekView`, `DayView`, and `ScheduleView`) in `React.memo` to prevent cascading render trees when tasks or active dates are unchanged.
  - Scoped the Zustand store subscription in `DayView` for the `pendingCount` badge by using a specific state filter selector wrapped in a memoized `useCallback`, preventing the entire view from re-rendering on unrelated task updates.
  - Removed high-cost `boxShadow` animations from the `whileHover` state on `DraggableTaskBlock` to reduce paint and compositor overhead during mobile scroll gestures.
- Fix chevron expand/collapse button and subtasks visibility getting stuck after a timeline task is dragged and dropped (normal reschedule or drag-to-category). Resolved by linking the visual rendering of the active drag state to the synchronous `dragging.current` ref (`isCurrentlyDragging = isActivelyDragging && dragging.current`), guaranteeing that the UI immediately resets to its non-dragging state and re-enables chevron interactions when the gesture ends, even before React state batching processes the asynchronous state update.

## [2026-07-14]
- Fix pending tasks list and pending badges to correctly exclude today's and future tasks (showing only incomplete tasks with past dates before today) and sort them descending (most recent past date first).
- Fix pencil and completion circle both non-functional on timeline card by removing conflicting `onPointerDown` handlers that were cancelling all touch and mouse end events, and styling them with robust non-overlapping tap targets (28px) placed side-by-side.
- Add a small pencil (edit) icon to the LEFT of the completion circle on the timeline task card. Tapping this pencil promotes the current task title to the top/first element of the subtask list, blanks the main task title, and opens the TaskSheet in edit mode with the pre-populated blank title and updated subtasks list, allowing the user to type a new title and save while preserving date, time, category, and existing subtasks.
- Add timeline task card drag-to-category: dragging a card vertically to reschedule still works exactly as before, but dragging it up and dropping it over any of the category tabs (Work, Personal, Health, Other) assigns that category to the task with a subtle haptic vibration and real-time hover highlight feedback.
- Show consistent "Day, Month Date" format tile on every day in the header, highlighting today with a blue background and white text, and displaying other active days as a clean, bordered non-colored tile.
- Fix oversized subtask row height and gaps in the pending task card by overriding the global button min-height and min-width rules with `minHeight: 'auto'` and `minWidth: 'auto'` on the subtask completion circle buttons, and setting subtask container spacing to `space-y-1`.

## [2026-07-13]
- Tighten subtask row vertical spacing by applying explicit `lineHeight` to subtask text and drag handles, and reducing row padding to `1px 4px`.
- Actually reduce subtask row gap in pending card by lowering the completion checkbox button wrapper height from 28px to 18px.
- Performance: memoize timeline layout, task cards, and filtered lists.
- Align pending card titles by adding a fixed-width chevron slot on every card, rendering a rotating chevron only on cards with incomplete subtasks while keeping empty slots on cards without subtasks to guarantee perfect vertical alignment of all titles.
- Pending card: tap-to-expand subtasks (remove chevron), preserve long-press-drag and reorder.
  - Removed the chevron button entirely from the pending card body for a cleaner look.
  - A single tap anywhere on the card body toggles expansion of subtasks (for cards with incomplete subtasks), or opens the task edit modal (for cards with no subtasks).
  - Subtasks inside the expanded card can be dragged up/down to reorder, using a nested dnd-kit context with touch/pointer sensors and absolute event isolation on completion circles.
- Add a chevron (expand/collapse) button + subtask display to each pending list card in the Pending/My Tasks overlay (matching the main timeline task card behavior).
- Ensure the chevron shows only when the task has at least one incomplete subtask, and expands/collapses the card to list subtasks beneath it with their own completion circles.
- Prevent any interaction conflict: the chevron button and subtask circles use stopPropagation/preventDefault to completely isolate their taps from the card's long-press-to-drag gesture.
- Display scheduled/created task times in a clean, muted 12-hour AM/PM format ("h:mm A") below the compact date on the left side of each pending task list card, only rendering when a valid time exists.

## [2026-07-11]
- Compact pending list card's date display to a single line format ("d MMMM") on the left and style the card to look exactly like the timeline task card (matching background color, borders, border-radius, font size/weight, and compact padding/height), while leaving all native layout structures and handlers untouched.
- Match pending list card visual styles (background colors, borders, border-radius, font sizing, and margins/compact padding) to the main timeline task card, keeping the layout structure and drag/click/toggle handlers intact.
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
