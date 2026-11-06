# Daily rewards recovery — Evidencia

## Contexto

- Repo: `brnd-floc/brnd-v2-frontend`.
- Rama: `codex/daily-rewards-recovery`.
- Base: `6a07a1d4534a6e20fe1801d151893a6a78a7f1c9`.
- Fecha: 2026-11-06 (UTC).
- Estado: cambio preparado y verificado localmente; sin push, PR, merge ni despliegue.

## Problema y resultado esperado

Usuarios con un voto confirmado podían quedar atrapados en «Voted Today» cuando faltaban las marcas del podio o fallaba la verificación del share. El refresco de autenticación no hacía ninguna petición y el flujo no ofrecía una recuperación efectiva. Además, el callback de éxito del claim ocupaba la posición incorrecta en `ShareView`.

El cambio recupera el voto ya existente mediante lecturas de cuenta y podio, ofrece un reintento explícito y permite revalidar un share existente. Mantiene separados los estados de voto, share y claim. No vuelve a enviar un voto para recuperar el flujo ni ejecuta un claim cuando el backend confirma que el reward ya se cobró.

## Cambios

- Refresco real de `/me`, deduplicado, con timeout de 15 segundos, errores visibles y protección frente a respuestas tardías tras logout.
- Conservación del progreso confirmado mientras el indexador se actualiza, limitada al mismo usuario, transacción y día UTC.
- Estado de recuperación para votos existentes sin datos completos; incluye el caso en que solo el contrato confirma el voto.
- Fallback de podio completo del mismo día, claves estables por día y FID, y conversión correcta de día de contrato a segundos Unix.
- Reintento de verificación sin recomponer el cast cuando ya se conoce su hash; acceso a verificación de un share existente tras reabrir la app.
- Firma nueva en cada intento explícito desde el estado compartido; liberación del estado ocupado cuando wagmi informa rechazo/error de wallet.
- Lectura de errores estructurados 503 del backend y de su respuesta `hasClaimed: true`.
- Callback de claim corregido y día firmado conservado aunque la confirmación llegue después de medianoche.
- Pantalla actual conservada durante los refrescos para evitar desmontajes y bucles de recuperación.

## Comandos ejecutados

```bash
npm exec --yes --package=bun -- bun install --frozen-lockfile --ignore-scripts
npm exec --yes --package=bun -- bun run test:rewards
npm run lint
npm run build
git diff --check
npm run lint:styles:strict
npm run cutover:check-env
```

## Resultado de checks

| Check | Resultado |
| --- | --- |
| Instalación con `bun.lock` versionado | OK; Bun 1.4.4, sin modificación de lockfiles. |
| `test:rewards` | OK: 17 tests, 54 assertions, 0 fallos. |
| `lint` | OK, exit 0. |
| `build` | OK, TypeScript y Vite, exit 0. Avisos de dependencias, importación dinámica/estática y tamaño de bundle. |
| `git diff --check` | OK. |
| Revisión independiente | OK tras corregir dos bordes: clave de recuperación inestable y confirmación que cruza medianoche UTC. |
| `lint:styles:strict` | Bloqueado por baseline: el script referenciado `scripts/check-scss-modules.mjs` no está en el repositorio. |
| `cutover:check-env` | Fallo heredado de configuración: espera `https://api.brnd.land`, pero `.env.production` versionada declara `https://brnd-v2-backend-production.up.railway.app`. No se ha cambiado la configuración de despliegue. |

## Cobertura y límites

Las regresiones verifican recuperación de voto existente sin segunda votación, fallback del mismo día, estado onchain frente a un `/me` rezagado, ausencia de reintentos automáticos ilimitados, claim ya cobrado sin otra llamada onchain, refresco tras error/timeout/logout, mensajes 503 y cambio de día UTC.

La validación es local y de lógica del flujo. No se ha completado un share ni una transacción real desde un cliente Farcaster o Base, ni se han modificado datos de usuarios. No demuestra que producción haya recuperado el servicio de firma, el indexador o el proveedor RPC. El fallback sigue necesitando que las APIs puedan devolver el voto y sus marcas.

El cambio acompaña la recuperación de `verify-share` en backend. Su contrato de errores reintentables usa `data.code`, `data.message` y `data.retryable`; la respuesta de un reward ya cobrado usa `hasClaimed: true` y `claimSignature: null`.

## Publicación y comprobación pendiente

No se ha publicado el cambio. La escritura remota quedó bloqueada en la coordinación del trabajo por falta de credenciales de git y un 403 de la integración GitHub. Antes de considerarlo resuelto en producción hay que publicar frontend y backend y comprobar con una cuenta afectada que puede recuperar el podio, verificar el share y cobrar una sola vez.
