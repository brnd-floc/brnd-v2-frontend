# Frontend Lint Program - Phase 3A (Trivial low-risk fixes)

Date: 2026-02-26
Branch: codex/fe-lint-phase-3a
Base: origin/main @ f9bdd45206764ac827f1b3a202b601a89c5df83f

## Scope
- src/pages/AirdropPage/partials/ClaimAirdrop/index.tsx
- src/pages/LeaderboardPage/partials/LeaderboardFeed/index.tsx
- src/pages/PodiumPage/partials/PublicPodiumsFeed/index.tsx
- src/pages/ProfilePage/partials/Power/index.tsx
- src/services/user.ts
- src/pages/AirdropPage/index.tsx (only constant-condition cleanup)

## Rules addressed
- `@typescript-eslint/no-explicit-any` in low-risk files
- `no-constant-condition` at Airdrop page guard

## Validation
- `bun run lint` -> 90 errors remaining (from 99)
- `bun run build` -> PASS
- `bun run cutover:smoke` -> PASS (0 failures, 0 warnings)

## Notes
- No intentional runtime behavior changes.
- Remaining lint debt is concentrated in Admin, Airdrop main, MyPodium, and contract hooks.
