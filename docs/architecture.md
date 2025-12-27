# Arquitectura (visión general)

## Capas & responsabilidades

- **UI (Front)**
  - React + Next.js App Router (futuro).
  - Componentes, páginas, y adaptadores para rutas versionadas.
  - No implementar en esta iteración.

- **Application / Orchestration**
  - Orquestación de flujos de trabajo, validación de comandos, coordinación de side-effects.
  - Contendrá casos de uso (use-cases) que consumen entidades del dominio y emiten eventos.

- **Domain**
  - Entidades, agregados, tipos y lógica de negocio pura.
  - Validaciones invariantes y modelado de `WorkEvent` como fuente de verdad “append-only”.

- **Infra / Persistence**
  - Implementaciones concretas: Outbox (IndexedDB/Dexie), cliente HTTP para backend.
  - Sin backend en esta iteración.

## Estructura de carpetas (sugerida)

```
src/
  lib/          # utilidades, adaptadores genéricos
  domain/       # entidades, tipos, reglas de negocio
  features/     # carpetas por dominio (workorders, pieces, batches)
  services/     # services/ports (interfaces) para infra
  infra/        # implementaciones concretas (dexie, http client) — solo scaffolding
  hooks/        # hooks compartidos
  types/        # tipos globales (TrackingMode, IDs, etc.)
  schemas/      # zod schemas
  tests/        # pruebas unitarias

docs/           # documentación de diseño
```

## Boundary rules
- Comunicación entre capas via interfaces/ports (dependency inversion).
- Domain no debe depender de infra ni de frameworks.
- Events son la fuente de verdad; el estado derivado se calcula por proyección desde eventos.

## Routing versionado (definición corta)
**Routing versionado** = incluir la versión del contrato en las rutas/handlers (p. ej. `/api/v1/...` o `app/(v1)/...`) y mantener adaptadores para migración gradual. Permite compatibilidad hacia atrás y despliegues con múltiples versiones activas.

## Principios
- Single Responsibility para módulos.
- Preferir tipos y validación explícita (Zod) en fronteras (entrada/salida).
