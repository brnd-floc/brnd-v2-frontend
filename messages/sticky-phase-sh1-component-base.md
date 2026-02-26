# Sticky Phase SH1 - Component base

Date: 2026-02-26
Branch: codex/fe-sticky-sh1
Base: origin/main @ ac9ff87543829a60b0f76f1147a23ae769b7e4e8

## Scope
- src/shared/components/StickyPageHeader/index.tsx (new)
- src/shared/components/StickyPageHeader/StickyPageHeader.module.scss (new)

## Changes
- Added shared sticky header component with style variants:
  - `tone`: `default | subtle`
  - `paddingY`: `none | sm | md`
- Preserved compatibility by keeping base `layout` class behavior.

## Validation
- bun install -> PASS
- bun run lint -> PASS
- bun run build -> PASS
- bun run cutover:smoke -> PASS

## Notes
- No page migrations in SH1; only component base introduction.
