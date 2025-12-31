import { v4 as uuidv4 } from 'uuid';
import { WorkEvent, WorkEventSchema, OutboxEventSchema } from '../../shared/schemas';
import { EventRepositoryDexie } from '../../data/dexie/eventRepositoryDexie';
import { OutboxRepositoryDexie } from '../../data/dexie/eventRepositoryDexie';
import { ProductionOrderRepositoryDexie } from '../../data/dexie/workOrderRepositoryDexie';
import { OperatorRepositoryDexie } from '../../data/dexie/operatorRepositoryDexie';
import { WorkCenterRepositoryDexie } from '../../data/dexie/workCenterRepositoryDexie';
import { LotRepositoryDexie } from '../../data/dexie/lotRepositoryDexie';
import { OperationRepositoryDexie } from '../../data/dexie/operationRepositoryDexie';

const eventRepo = new EventRepositoryDexie();
const outboxRepo = new OutboxRepositoryDexie();
const orderRepo = new ProductionOrderRepositoryDexie();
const operatorRepo = new OperatorRepositoryDexie();
const workCenterRepo = new WorkCenterRepositoryDexie();
const lotRepo = new LotRepositoryDexie();
const operationRepo = new OperationRepositoryDexie();

export type RecordProductionInput = {
  orderId: string;
  operationId: string;
  operatorId: string;
  workCenterId?: string;
  lotId?: string;
  qtyDonePieces: number;
  qtyScrapPieces?: number;
  note?: string;
};

export async function fetchOperators() {
  return operatorRepo.list();
}

export async function fetchWorkCenters() {
  return workCenterRepo.list();
}

export async function fetchLotsByProduct(productId: string) {
  return lotRepo.listByProduct(productId);
}

export async function fetchOperationById(operationId: string) {
  return operationRepo.getById(operationId);
}

export async function recordProduction(input: RecordProductionInput): Promise<WorkEvent> {
  // Validate order exists
  const order = await orderRepo.getById(input.orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  // Validate operator exists
  const operator = await operatorRepo.getById(input.operatorId);
  if (!operator) {
    throw new Error('Operator not found');
  }

  // Validate workCenter if provided
  if (input.workCenterId) {
    const workCenter = await workCenterRepo.getById(input.workCenterId);
    if (!workCenter) {
      throw new Error('Work center not found');
    }
  }

  // Validate lot if provided
  if (input.lotId) {
    const lot = await lotRepo.getById(input.lotId);
    if (!lot) {
      throw new Error('Lot not found');
    }
    // Validate lot belongs to order's product
    if (lot.productId !== order.productId) {
      throw new Error('Lot does not belong to order product');
    }
  }

  // Validate operation exists and is in routing snapshot
  const operation = await operationRepo.getById(input.operationId);
  if (!operation) {
    throw new Error('Operation not found');
  }

  // Validate operation is in routing snapshot
  const routingSnapshot = order.routingVersionSnapshot as { operations?: Array<{ operationId: string }> } | undefined;
  if (!routingSnapshot?.operations) {
    throw new Error('Order routing snapshot is invalid');
  }
  const operationInRouting = routingSnapshot.operations.some((op) => op.operationId === input.operationId);
  if (!operationInRouting) {
    throw new Error('Operation is not in order routing');
  }

  // Build payload
  const payload: Record<string, unknown> = {
    operationId: input.operationId,
    qtyDone: input.qtyDonePieces,
    operatorId: input.operatorId,
  };

  if (input.qtyScrapPieces !== undefined && input.qtyScrapPieces > 0) {
    payload.qtyScrap = input.qtyScrapPieces;
  }

  if (input.workCenterId && input.workCenterId !== '') {
    payload.workCenterId = input.workCenterId;
  }

  if (input.lotId && input.lotId !== '') {
    payload.lotId = input.lotId;
  }

  if (input.note && input.note.trim() !== '') {
    payload.note = input.note.trim();
  }

  // Create and validate event
  const event = WorkEventSchema.parse({
    id: uuidv4(),
    type: 'OperationRecorded',
    aggregateId: input.orderId,
    workshopId: order.workshopId,
    timestamp: new Date().toISOString(),
    payload,
    schemaVersion: 1,
  });

  // Persist event (append-only)
  await eventRepo.append(event);

  // Enqueue to outbox (TODO: implement flush outbox in future)
  const outboxEvent = OutboxEventSchema.parse({
    ...event,
    status: 'pending' as const,
  });
  await outboxRepo.enqueue(outboxEvent);

  return event;
}

