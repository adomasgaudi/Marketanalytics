# agent8 — navigation and market clarity

## In 30 words

Shipped v3.101: labeled donut details, confirm-before-filter behavior, public
2021–2025 focus, all-years Markets default, explicit view switching, distinct
Companies styling, and a half-second page transition.

## In 300 words

The full-market donut now names segments on sufficiently large slices and shows
the complete legend on phones. Selecting a slice or legend item opens a details
dialog with the segment value, share, company count, employment, and leading
companies. The URL segment filter changes only when the user presses the dialog
button; opening details alone never filters the page. Scoped company behavior
is unchanged.

Public views now expose 2021–2025. Years 2017–2020 remain in the model and become
available when the persisted Dev mode is active. The default year is explicitly
2025, while Markets now opens in all-years mode. The hero no longer says “whole
market” in the unscaled view, and each hero has a destination-labeled time-view
switch below it.

Top navigation is now two plain page tabs: Markets and Companies. Cross-page
clicks show a 0.5-second loading overlay before navigation. Companies also uses
a subtle purple-tinted background so the page switch is visually obvious.

Version sequencing was corrected: the earlier company-strip release is v3.100,
and this batch is v3.101. Package metadata, generated app label, AGENTS version,
and newest-first changelog agree. Production build and targeted lint pass.
