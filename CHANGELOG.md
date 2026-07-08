# Changelog

## [Unreleased]
- Fix stuck drag flag breaking chevron after drag

## [2026-07-07]
- **Refactor stage 1**: Extracted pure timeline helper functions (`timeToMinutes`, `minutesToTime`, `layoutTasks`) to `src/utils/timelineHelpers.ts` and `useLongPress` hook to `src/hooks/useLongPress.ts`.
- **Fix chevron/subtasks after drag (reset drag flag)**: Fixed a bug where subtasks would remain hidden after dragging an expanded task card. Subtasks now correctly reappear because the drag flag is now a state that unconditionally resets on drag end.
- **Raise delete toast z-index**: Set the delete toast `z-index` to 950 and used `position: fixed` to ensure it always appears above all task cards and avoids being covered.
- **Collapse task card to title-only while dragging, re-expand on drop**: Updated the `DraggableTaskBlock` component to dynamically collapse its subtask list while dragging. This provides a neat and uncluttered visual representation of the task block during displacement, which then automatically re-expands upon dropping.
- **Match timeline completion circle color to task title**: Updated the visible completion circle's border/fill color on the timeline task card to use the `fg` variable so it dynamically matches the title text color (dark blue on active blue cards and muted grey on completed cards), while keeping the checkmark visible.
- **Adjusted completion circle size**: Updated the visible completion circle in both the timeline task cards and the pending task list to 16px diameter, with custom background colors (blue-tinted for timeline, white for pending) to better match their respective cards.
- **Match pending list circle to timeline circle size**: Updated the visible completion circle in the Pending Tasks list (`TaskItemRow`) to exactly match the timeline task card's completion circle size (24px visible diameter, 2px border, same checkmark) while maintaining the 40px tap target.
- **Task Title Enter-to-Save**: Changed the onKeyDown behavior on the Task Title input in the task sheet. Pressing 'Enter' while focused on the Title now saves the task immediately (identical to clicking the Save button) rather than jumping to/creating a subtask. Subtasks can now be added by clicking the "+ Add subtask" button, and pressing Enter in a subtask continues to add/focus the next subtask as before.
- **Fixed Task Position & Time Edit Stability**: Fixed a bug where opening a task for editing or changing its title caused its timeline position/time to jump. The Task Sheet now correctly loads the existing task's time and date, and never calls `getDefaultTime` in edit mode, completely preventing any unintended timeline movement when opening, saving, or closing the edit sheet.
- **Pending Tasks Bar Simplification**: Removed the pending task count circular number badge and the "Open Tasks List" text/chevron button from the Pending Tasks bar above the timeline. Access to the Pending Tasks list screen remains fully functional and intuitive by clicking anywhere on the "Pending Tasks" label bar.
- **Timeline Filtering for Completed Tasks**: Configured the calendar and timeline view to immediately remove tasks once they are marked complete, keeping the daily and weekly schedule strictly focused on outstanding items.
- **Completed Tasks List in Pending Overlay**: Enabled a dedicated, persistent "Completed Tasks" list in the Pending Tasks overlay screen that aggregates all completed tasks, styled with checked circles, strikethrough text, and muted colors. Tapping the completed circle immediately restores the task back onto the calendar/timeline.
- **FAB Z-Index Stacking Correction**: Raised the floating "+" FAB container's z-index to 900 and positioned it directly at the root mobile viewport level. This prevents it from getting trapped in lower sibling stacking contexts, ensuring it is always clickable above all timeline items and task cards on every mobile/desktop screen while still layer-recessed below open modals or sheets.
- **Header Simplification**: Simplified the main app header to show only the ☰ Hamburger menu button, today's date formatted as a short string (e.g. "July 7"), and a wide search input field bar with a clear button.
- **Header Buttons Preserved**: Commented out and preserved the navigation buttons, calendar-jump button, and task count indicator badge under a clearly labeled disabled block (`{false && ...}`) for easy future re-enablement.
- **Built-in Search**: Integrated the search input bar directly into the Header component, connected it directly to the existing search query state, which automatically filters the timeline tasks and subtasks.
- **Subtasks Header Label Removed**: Removed the "+ SUBTASKS (0/50)" label row from the TaskSheet to free up more vertical space for subtask list rendering.
- **Task Title Enter to Subtask Focus**: Configured the Task Title input field's `onKeyDown` so that pressing Enter automatically adds/focuses the first empty subtask row, establishing a fluid title-to-subtask creation workflow.

## [2026-07-06]
- **Task Title in Header**: Replaced separate task title row and "New task" text with a single header row containing the V (close) button, the live task title input field, and the Save button, saving significant vertical space.
- **Subtask Auto-Save & Enter creation**: Configured subtasks to save live on every keystroke. Pressing Enter inside a subtask row automatically creates a new empty subtask row and focuses it. Completely empty subtask rows are automatically filtered out when saving the task.
- **Conditional Chevron Button**: Wrapped the expand/collapse chevron button on timeline task cards inside a conditional check, so it is only rendered if the task has one or more subtasks. Otherwise, the title expands cleanly from the left.
- Replaced the static "New task" / "Edit task" header title with live mirroring of the active task title being typed, displaying a faint "New task" or "Edit task" placeholder when empty.
- Abandoned unreliable browser history popstate/PWA back-button interception completely, ensuring the hardware back button is safely ignored while the sheet is open.
- Added a highly reliable on-screen down-chevron back/close button in the sheet's top-left header that blurs active input/keyboard on first tap, and closes the sheet on the next tap (no save).
- Extended the back/close behavior to the top gray handle bar and the dark backdrop/scrim clicks for a cohesive, intuitive dismissal experience.
- Fixed subtask row height, margin, padding, and min-height in `SortableSubtask` to be extremely compact while keeping font sizes identical, ensuring 4+ subtask rows are comfortably visible even when typing.
- Perfected the double-back-to-exit flow for sheets: popstate handler in `TaskSheet` blurs the active input on first back, and pushes a state back to re-arm the handler so that a second back tap closes the sheet.
- Integrated a programmatic back button bypass using `window.isProgrammaticBack` to ensure that programmatic sheet closure (on Save/backdrop click) never triggers the global double-tap app-exit toast.
- Fixed subtask vertical stacking space by conditionally hiding Category pills and Date & Time sections when the keyboard is open (any input is focused), restoring full height of the subtask list to comfortably display 5+ rows and allowing natural scrolling.
- Scoped back gesture completely to the Task Sheet while open, disabling global app exit popstate listener using a new `isTaskSheetOpen` store state flag.
- Integrated seamless keyboard-first sheet dismissal flow: first back tap blurs active input, second back tap safely closes the task sheet without saving.
- Fixed ghost card issue: conditionally disabled background timeline/DayView `DraggableTaskBlock` absolutely-positioned cards when the `TasksOverlay` (My Tasks / Pending Tasks) list is open.
- Rearranged `TaskSheet` layout: placed the scrollable subtasks container immediately below the task title input, and above the category and date/time selectors, keeping saved subtasks and the inline subtask adder fully visible and stacked in order at the top.
- Removed the "X" close button from the top-left of the task sheet header.
- Implemented a double-tap/gesture keyboard-first exit flow: wired `handleExit` to popstate (back gesture), backdrop, and top handlebar so the first tap blurs the active input (closes keyboard) and the second tap (within 2 seconds) safely closes the sheet. Added a subtle "Tap top bar again to close" pill notification for first tap feedback.

## [2026-07-05]
- Implemented subtask auto-scroll: newly added inline subtasks automatically scroll the subtask list container to the bottom.
- Added delayed scroll-into-view handler on subtask input focus to ensure they remain completely visible above the virtual keyboard when typing.
- Enlarged task and subtask completion circle tap targets to 40px invisible hit zones with touch-action manipulation and event stop propagation to ensure reliable, instant single-tap completion toggles.

## [2026-07-04]
- Baseline frozen. All core features working.
- Removed temporary green debug panel and its associated `addDebug` and `debugLog` state/handlers cleanly.
- Implemented task-time vertical stacking (placed 60 minutes apart sequentially) when creating multiple tasks on the same day without choosing a specific time.
