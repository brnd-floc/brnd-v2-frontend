# Frontend Lint Program - Phase 3E (contract hooks part 1)

Date: 2026-02-26
Branch: codex/fe-lint-phase-3e
Base: origin/main @ 26786b924d1a1b641d48379a2f8c2b688b192cd4

## Scope
- src/shared/hooks/contract/useContractWagmi.ts
- src/shared/hooks/contract/usePodiumCollectibles.ts

## Rules addressed
- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-unused-vars` (removed unused pending claim state)

## Validation
- `bun run lint` -> 23 errors remaining (all in `src/shared/hooks/contract/useAirdropClaim.ts`, planned for phase 3F)
- `bun run build` -> PASS
- `bun run cutover:smoke` -> PASS (0 failures, 0 warnings)
- `bunx eslint src/shared/hooks/contract/useContractWagmi.ts src/shared/hooks/contract/usePodiumCollectibles.ts` -> PASS

## Notes
- Replaced `any` with explicit callback and transaction-related types.
- Added safe error-message extraction using `unknown` narrowing.
- Kept transaction sequencing and runtime behavior unchanged.
