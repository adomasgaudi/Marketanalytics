# agent11 — version alignment

## In 30 words

The owner requested v3.111 specifically through adomasgaudi. The GitHub connector authenticates as that account; the local CLI authenticates as adomasgaudi26. Use the connector for repository writes in this session.

## In 300 words

This is a version-only request. Package metadata started at 3.110.1 while the generated app constant and newest history entry remained at 3.110.0. The visible label intentionally omits the patch component, so the requested v3.111 maps to package version 3.111.0. Run scripts/app/write-version.mjs to derive both the app constants and AGENTS.md stamp. The build script currently runs next build without invoking that generator, making explicit generation necessary before publishing a version change.

Account selection is consequential here: the owner explicitly excluded adomasgaudi26. Verify connector identity independently of gh auth status. A public clone is suitable for inspection, but authenticated mutations should use the verified adomasgaudi connector. Preserve the existing main history with a non-forced update so concurrent work cannot be overwritten.

## Follow-up: 2026-09-10

The owner requested removal of the pictured xray / box / pad / margin / inspect toolbar from the live site. Removed its global script loader and public asset, and unmounted the shared developer corner so a saved dev-mode preference cannot restore the overlay. Existing development-mode data controls remain available. Version v3.112 records this change. The production build and TypeScript check passed.
