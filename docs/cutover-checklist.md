# Cutover Checklist (`brnd.land`)

## Pre-release

1. Validate production env values:

```bash
npm run cutover:check-env
```

2. Build + styles gate:

```bash
npm run build
npm run lint:styles:strict
```

3. Backend pre-release baseline (run in backend repo):

```bash
npm run cutover:verify-api -- \
  --api-base=https://api.brndland.com \
  --brand-ids=431,428,1 \
  --strict-category \
  --out=./tmp/cutover-baseline-pre.json
```

## Post backend release

```bash
npm run cutover:verify-api -- \
  --api-base=https://api.brndland.com \
  --brand-ids=431,428,1 \
  --strict-category \
  --out=./tmp/cutover-baseline-post-backend.json
```

## Post frontend release

```bash
npm run cutover:smoke -- \
  --app-url=https://brnd.land \
  --api-base=https://api.brndland.com \
  --brand-ids=431,428,1 \
  --strict-category
```

## Manual smoke (required)
- Home -> Brand -> Vote -> Share -> Profile
- Lotry: guardian card visible through FID fallback when needed.
- PIXY: ticker/contract visible.
- Brand with no guardian: guardian card hidden.

## Rollback trigger
- sustained 5xx increase
- critical JS runtime regressions
- brand detail contract mismatch breaking profile render

## Rollback order
1. Frontend rollback.
2. Backend rollback if issue persists.
3. Re-run `cutover:verify-api` and `cutover:smoke`.
