# Coding Standards (resumen)

## TypeScript
- `"strict": true` en `tsconfig.json`.
- No `any`. Evitar `@ts-ignore` salvo excepción justificada en PR con comentario.
- Preferir `unknown` + validación/guards cuando sea necesario.
- Tipos e interfaces prefijadas por ámbito: `I` no es obligatorio; usar `type` para uniones sencillas y `interface` para estructuras extensibles.

## Naming
- Archivos: `kebab-case` o `camelCase` según consenso del equipo (preferir `kebab-case` en rutas y `camelCase` en código).
- Types/Interfaces: `PascalCase` (`WorkOrder`, `WorkEventPayload`).
- Hooks: `useSomething`.
- Stores: `use<Feature>Store` o `create<Feature>Store`.

## Validación
- Zod para validación de entradas/salidas y contratos externos.
- Validar fronteras (API, Outbox, Reconcilers).

## Test
- Unit tests con Vitest.
- Cobertura mínima: definir por feature; priorizar pruebas para domain y proyecciones.
- Tests deterministas: evitar dependencias de tiempo, utilizar fakes para relojes y generadores de ID.

## Lint / Formatting
- ESLint + Prettier (config aún por definir en próximas iteraciones).

## Pull Requests
- PR debe incluir: descripción, issue/objetivo, cambios clave y un changelog si aplica.
- Revisiones obligatorias: al menos una aprobación de otro dev.

## Ejemplos rápidos
- Validación Zod en una boundary:

```ts
const WorkOrderSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  quantityRequested: z.number().int().positive()
});
```

## Reglas operativas
- Documentar decisiones importantes en `docs/`.
- Definir `trackingMode` por `workshop/tenant` (choice: `"piece" | "lot" | "hybrid"`).
