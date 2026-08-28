# Maps — drawer settings addendum — 2026-08-30

## Fog appearance

Fog color and opacity are **map-global** settings. They live in the **Settings** tray (`#mapsDrawerSettings`), not the tool tray.

## Reveal / Hide tools

Reveal and Hide are paint-only toolbar modes. Selecting them must **not** auto-open the tool drawer.

## Selection editing (shape / stroke)

When pan-selecting a shape or brush stroke, the tool drawer opens in **selection** mode (`data-selection-kind`) with properties bound to the selected object. Text and token content editing remain modal overlays.
