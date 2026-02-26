# SCSS Architecture A2 - Global consolidation

Date: 2026-02-26
Branch: codex/fe-scss-a2
Base: origin/main @ b7bd07731335ac4076c2b31ca6d9ce5885a1043f

## Scope
- src/shared/styles/global.scss
- src/shared/styles/_mixins.layout.scss
- src/shared/styles/_mixins.scroll.scss
- src/shared/styles/_effects.index.scss
- src/shared/styles/_effects.animations.scss

## Changes
- Added reusable `stickySurface` mixin to centralize sticky background/blur/border/shadow primitives.
- Added reusable `appScrollbar` mixin and moved global scrollbar rules out of `global.scss` duplication.
- Documented effects entrypoint contract in `_effects.*`.

## Validation
- bun install -> PASS
- bun run lint -> PASS
- bun run build -> PASS
- bun run cutover:smoke -> PASS
