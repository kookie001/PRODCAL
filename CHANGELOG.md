# Changelog

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
