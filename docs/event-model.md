# Modelo de Eventos

## Principio: Event append-only
Los eventos son inmutables y siempre se **appenden** al stream; **nunca se actualizan ni eliminan**. El estado actual de cualquier agregado se obtiene re-aplicando los eventos en orden.

## Estructura base de `WorkEvent`

```json
{
  "id": "uuid-v4",
  "type": "WorkOrderCreated | PieceProduced | PieceScrapped | WorkEventRecorded | ...",
  "aggregateId": "workOrderId | pieceId | batchId",
  "workshopId": "uuid",
  "timestamp": "ISO-8601",
  "payload": { /* tipo específico por evento */ },
  "schemaVersion": 1
}
```

- `id`: identificador único del evento (idempotencia + dedupe).
- `schemaVersion`: versión del esquema del evento para permitir evolución.

## Tipos de eventos (ejemplos)
- `WorkOrderCreated`
- `WorkOrderStarted`
- `WorkOrderPaused`
- `WorkOrderCompleted`
- `PieceProduced` (piece-tracking)
- `PieceScrapped`
- `BatchProduced` (lot-tracking)
- `OperationRecorded` (registro de operación con métricas/outputs)

## Agregados y proyecciones
- **Agregado WorkOrder**: aplica eventos para derivar estado (status, producedQty, scrapQty)
- **Proyecciones**: tablas/indices para consultas eficientes (por pieza, por lote, por estación)

## Versionamiento y routing versionado
- Cada evento tiene `schemaVersion`. Los handlers y proyecciones deben ser capaces de migrar/transformar eventos antiguos.
- **Routing versionado**: incluir versión en rutas y en la negociación de contrato (headers o path). Evita rupturas en despliegues distribuidos.

## Idempotencia
- Producción/consumo de eventos debe ser idempotente: usar `id` del evento y guardarlo en una tabla de dedupe antes de aplicarlo.
- Cuando se sincroniza desde outbox, verificar si `id` ya fue procesado.
