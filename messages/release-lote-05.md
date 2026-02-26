# Release Lote 05 — Evidencia

## Contexto
- Repo: brnd-v2-frontend
- Lote: 05
- Rama: codex/fe-lote-5
- Objetivo: paridad guardian fields/fallback en Brand Page

## Commits portados
- 6e83d36 (aplicado como 1e50308)
- 3c04378 (aplicado como 566e0ae)

## Ajuste de compatibilidad aplicado
- Se eliminó dependencia a utilidades no presentes en `main` para mantener compilación del lote.
- Se reemplazó apertura de perfil guardian por `window.open` a Warpcast.
- Se retiró prop `disableContentScroll` inexistente en `AppLayout` actual.

## Comandos ejecutados
```bash
bun install
bun run lint
bun run build
bun run cutover:check-env
bun run cutover:smoke
```

## Resultado de checks
- bun install: OK
- bun run lint: FAIL por deuda histórica global de estilo fuera de scope
- bun run build: OK
- cutover:check-env: OK
- cutover:smoke: OK
