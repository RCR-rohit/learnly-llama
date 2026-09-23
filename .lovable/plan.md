# Light and dark appearance switch

## What will change
- Add a compact sun/moon toggle to the top navigation.
- Create a polished light version of the existing cyber-glass palette while preserving the current dark style.
- Remember the selected appearance in this browser and respect the device preference on first visit.
- Keep the control accessible with a clear label and keyboard support.

## Technical details
- Manage the theme class at the document level after hydration to avoid rendering mismatches.
- Store the preference locally; no account or cloud storage is needed.
- Reuse the existing button and semantic color system so every current page switches consistently.
- Verify both appearances on desktop and mobile, including page reload persistence.
