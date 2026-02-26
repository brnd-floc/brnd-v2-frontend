# Frontend Lint Program - Phase 2B (Services + vote flow low-risk)

Date: 2026-02-26
Branch: codex/fe-lint-phase-2-types-b
Base: origin/main @ 80d230a17d294fd23f885078e7bdfe5ce3ed0101

## Scope
- Remove low-risk lint debt in service and vote-flow files.
- Focus on:
  - `@typescript-eslint/no-unused-vars`
  - `no-useless-catch`
  - selected `@typescript-eslint/no-explicit-any`

## Files
- src/pages/VotePage/index.tsx
- src/pages/VotePage/partials/PodiumView/index.tsx
- src/pages/VotePage/partials/ShareView/index.tsx
- src/services/api/index.ts
- src/services/airdrop.ts
- src/services/auth.ts
- src/services/user.ts

## Validation
- `bun run lint` -> 102 errors remaining (from 131 after phase 2A)
- `bun run build` -> PASS
- `bun run cutover:smoke` -> PASS (0 failures, 0 warnings)
