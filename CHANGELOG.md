# Changelog

## [2026-07-05]
- Implemented subtask auto-scroll: newly added inline subtasks automatically scroll the subtask list container to the bottom.
- Added delayed scroll-into-view handler on subtask input focus to ensure they remain completely visible above the virtual keyboard when typing.

## [2026-07-04]
- Baseline frozen. All core features working.
- Removed temporary green debug panel and its associated `addDebug` and `debugLog` state/handlers cleanly.
- Implemented task-time vertical stacking (placed 60 minutes apart sequentially) when creating multiple tasks on the same day without choosing a specific time.
