# Sticky Phase SH2 - Home + Podium migration

Date: 2026-02-26
Branch: codex/fe-sticky-sh2
Base: origin/main @ 81b57932ec58af10701c06261098d6a1459dbecd

## Scope
- src/pages/HomePage/index.tsx
- src/pages/PodiumPage/index.tsx

## Changes
- Wrapped Home header block with shared `StickyPageHeader` (`paddingY="sm"`).
- Wrapped Podium header block with shared `StickyPageHeader` (`paddingY="sm"`).
- No behavioral changes to feed/data flows.

## Validation
- bun install -> PASS
- bun run lint -> PASS
- bun run build -> PASS
- bun run cutover:smoke -> PASS

## Mobile smoke focus
- `/` -> header remains sticky and content visible.
- `/podium` -> sticky header + title/description render stable.
