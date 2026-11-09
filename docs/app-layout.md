# Shared Élan layout

`app-layout.css` loads after the component styles and defines the app frame and shared form tokens. `app.js` adds `app-shell` to every route, including secondary pages and the live session. No sporting model, storage format, Supabase function or account data is changed.

- The outer frame is 1040 px maximum, with 10 px phone gutters and 20 px desktop gutters. Header geometry is shared: 44 px height/avatar/bell, 25 px brand. All routes respect the same top and bottom safe areas.
- Primary screens retain a 3 px header separation; secondary screens use 8 px. Editor headings use the secondary title size. The competition and objectives content no longer add their own extra horizontal inset.
- Standalone forms use a 640 px readable width, 12 px panel padding, 14 px corner radius, 10 px field spacing and 44 px controls with 16 px input text. Row forms use 36 px compact fields, and steppers retain 32 px input/buttons. These sizes are semantic variants, not per-page guesses.
- Standard correction, muscle, target, planning and group dialogs share width, padding and form typography. Specialized rest/cardio/picker overlays retain their interaction layouts.
- Live workout safe-area variables, sticky exercise header, keyboard mode and editor footers remain functional. The keyboard may hide the global brand header and replace page bottom padding with the dedicated input space.

Verification uses browser fixtures rather than real accounts. `tests/app-layout-ui.cjs` visits primary/secondary screens and account forms across phone and desktop widths. Existing live workout, input stability, editor/group, objective, challenge and measurements journeys check interactions and preserved sporting data. Synthetic safe-area and visualViewport checks are not physical iPhone/Safari/PWA testing.
