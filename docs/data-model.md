# Modelo de Datos (resumen)

## Entidades principales

- **Workshop / Tenant**
  - id, name, settings
  - settings.trackingMode: `"piece" | "lot" | "hybrid"`

- **Product**
  - id, sku, name, metadata

- **WorkOrder**
  - id, productId, quantityRequested, status (created|started|paused|completed|cancelled), workshopId
  - relaciona operaciones y asignaciones a estaciones.

- **Piece** (seguimiento por pieza)
  - id (serial), workOrderId?, batchId?, productId, status, timestamps

- **Batch** (seguimiento por lote)
  - id (batchNumber), workOrderId, productId, quantity, attributes

- **Operation / Workstation**
  - id, name, operationType, stationId

- **WorkEvent** (ver docs/event-model.md)
  - id (UUID), type, timestamp, workshopId, aggregateId (workOrderId/pieceId), payload, version

## Relaciones principales
- Workshop 1..* WorkOrder
- WorkOrder 1..* Piece
- WorkOrder 1..* Batch
- Piece may belong to Batch

## Observaciones
- `trackingMode` determina si `Piece` se utiliza (piece-tracking), `Batch` (lot-tracking), o ambos (hybrid).
- Al diseñar índices y queries, priorizar búsquedas por `workshopId`, `aggregateId`, `timestamps`.

## Tipos y convenciones
- IDs: UUIDv4 para eventos/entidades (salvo `batchNumber` si viene de planta).
- Fechas en UTC ISO-8601.
- Validación de esquema con Zod; todas las entradas/salidas deben ser validadas en los límites.
