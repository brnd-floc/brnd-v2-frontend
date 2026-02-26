# Frontend Lint Program - Phase 2A (Types/structure small batch)

Date: 2026-02-26
Branch: codex/fe-lint-phase-2-types
Base: origin/main @ 59fd81ab3c36eb3a578a48c3101b217faad5dcb0

## Scope
- Resolve non-autofix lint in prioritized areas:
  - src/shared/providers
  - src/shared/hooks
- Rules addressed in this batch:
  - `@typescript-eslint/ban-types`
  - `@typescript-eslint/no-explicit-any`
  - `no-empty`

## Files
- src/shared/providers/AppProvider.tsx
- src/shared/providers/ModalProvider/modals/PerksModal/index.tsx
- src/shared/providers/ModalProvider/types.ts
- src/shared/hooks/brands/useOnChainBrand.ts
- src/shared/hooks/user/useAirdropClaimStatus.ts

## Validation
- `bun run lint` -> 131 errors remaining (was 138 after phase 1)
- `bun run build` -> PASS
- `bun run cutover:smoke` -> PASS (0 failures, 0 warnings)
