# Plan Offline (Outbox, idempotencia y sync)

## Objetivo
Permitir operativa offline (talleres con conectividad intermitente) y sincronización segura y consistente hacia backend.

## Estrategia principal: Outbox local
- Registrar localmente los eventos en un *outbox* (IndexedDB via Dexie).
- Evento: `{ id, type, payload, timestamp, workshopId, schemaVersion, status }`.
- `status`: pending | sending | sent | failed.

## Flujo de sincronización
1. Crear y persistir evento en outbox (atomic con la acción local).
2. Intentar envío al backend (PUT/POST con backoff). Marcar como `sending`.
3. Backend responde: success -> marcar `sent`, error -> `failed` con retry.
4. Dedupe en servidor por `event.id` para asegurar idempotencia.

## Idempotencia
- Generar `id` de evento cliente (UUID) y usarla como idempotency key en servidor.
- En el cliente: antes de aplicar una confirmación de servidor, comprobar si ya se aplicó localmente.

## Reintentos y estrategia de backoff
- Exponencial con jitter, límites y degradación a modo *batch* si la red está pésima.

## Conflictos y resolución
- Evitar operaciones destructivas.
- Si existe conflicto lógico: aplicar reglas de negocio (e.g., última medición válida, reconciliación manual).
- Registrar incidentes con suficiente contexto para auditoría.

## Sincronización incremental y orden
- Mantener orden por `aggregateId` cuando sea necesario (por ejemplo, por `workOrderId`).
- Si se pierde orden, aplicar versiones de eventos y validación de estado en el servidor.

## Implementación recomendada
- Cliente: Dexie para outbox y sincronización; exponer API de enqueue/send/peek/retry.
- Servidor: idempotency store (e.g., MongoDB collection con eventId) y endpoint para upsert de eventos.
