# SCSS Architecture A3 - Core module adoption

Date: 2026-02-26
Branch: codex/fe-scss-a3
Base: origin/main @ d2ca4f2d481504d37268ec85bfd3b66a7cc97aa5

## Scope
- src/pages/HomePage/HomePage.module.scss
- src/pages/PodiumPage/PodiumPage.module.scss
- src/pages/BrandPage/BrandPage.module.scss
- src/pages/ProfilePage/ProfilePage.module.scss
- src/pages/RankingPage/RankingPage.module.scss
- src/pages/LeaderboardPage/LeaderboardPage.module.scss

## Changes
- Replaced repeated layout declarations with shared mixins (`appPageBody`, `columnAlign`, `rowAlignCenter`).
- Kept module structure and selectors stable while reducing duplicated declarations.
- No JSX changes in this lote.

## Validation
- bun install -> PASS
- bun run lint -> PASS
- bun run build -> PASS
- bun run cutover:smoke -> PASS
