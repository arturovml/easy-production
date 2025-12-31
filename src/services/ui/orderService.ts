import { v4 as uuidv4 } from 'uuid';
import { ProductionOrder, ProductionOrderSchema, WorkEventSchema, OutboxEventSchema } from '../../shared/schemas';
import { ProductionOrderRepositoryDexie } from '../../data/dexie/workOrderRepositoryDexie';
import { EventRepositoryDexie, OutboxRepositoryDexie } from '../../data/dexie/eventRepositoryDexie';
import { ProductRepositoryDexie } from '../../data/dexie/productRepositoryDexie';
import { OperationRepositoryDexie } from '../../data/dexie/operationRepositoryDexie';
import { computeOrderProgressFromEvents, computeStageTotalsFromEvents } from '../../domain/services/aggregation';
import { fetchProductById } from './productService';
import { fetchRoutingVersionById, fetchRoutingOperationsByVersion } from './routingService';
import { fetchOperationById } from './operationService';

const orderRepo = new ProductionOrderRepositoryDexie();
const eventRepo = new EventRepositoryDexie();
const productRepo = new ProductRepositoryDexie();
const operationRepo = new OperationRepositoryDexie();

export type CreateProductionOrderInput = {
  productId: string;
  quantityRequested: number;
  notes?: string;
};

type RoutingSnapshotOperation = {
  operationId: string;
  sequence: number;
  standardMinutes: number; // Required for aggregation
  operationName?: string; // Optional: for UI display
  qualityGate?: boolean; // Optional: for future use
  workCenterId?: string; // Optional: override
};

type RoutingSnapshot = {
  id: string;
  productId: string;
  operations: RoutingSnapshotOperation[];
};

export async function createProductionOrderPiece(input: CreateProductionOrderInput): Promise<ProductionOrder> {
  // a) Fetch product by id
  const product = await fetchProductById(input.productId);
  if (!product) {
    throw new Error('Product not found');
  }

  // b) Validate that product.activeRoutingVersionId exists
  if (!product.activeRoutingVersionId) {
    throw new Error('Publish a routing version first');
  }

  // c) Fetch routingVersion active + routingOperations
  const routingVersion = await fetchRoutingVersionById(product.activeRoutingVersionId);
  if (!routingVersion) {
    throw new Error('Active routing version not found');
  }
  if (routingVersion.isDraft) {
    throw new Error('Active routing version is still a draft. Publish it first.');
  }

  const routingOperations = await fetchRoutingOperationsByVersion(routingVersion.id);
  if (routingOperations.length === 0) {
    throw new Error('Active routing version has no operations');
  }

  // d) Build routingSnapshot with full operation details
  const operationsWithDetails = await Promise.all(
    routingOperations.map(async (ro) => {
      const operation = await fetchOperationById(ro.operationId);
      if (!operation) {
        throw new Error(`Operation ${ro.operationId} not found`);
      }

      const standardMinutes = ro.standardMinutesOverride ?? operation.durationMinutes;

      return {
        operationId: ro.operationId,
        sequence: ro.sequence,
        standardMinutes, // Required for aggregation
        operationName: operation.name, // Optional: for UI display
        qualityGate: operation.qualityGate ?? false, // Optional: for future use
        workCenterId: ro.workCenterIdOverride, // Optional: override
      } as RoutingSnapshotOperation;
    })
  );

  // Sort by sequence to ensure correct order
  operationsWithDetails.sort((a, b) => a.sequence - b.sequence);

  const routingSnapshot: RoutingSnapshot = {
    id: routingVersion.id,
    productId: product.id,
    operations: operationsWithDetails,
  };

  // e) Create ProductionOrder
  const workshopId = uuidv4(); // Generate new workshopId for this order
  const order = ProductionOrderSchema.parse({
    id: uuidv4(),
    productId: input.productId,
    quantityRequested: input.quantityRequested,
    workshopId,
    routingVersionSnapshot: routingSnapshot,
  });

  // f) Persist via repository
  await orderRepo.add(order);

  // Create initial WorkEvent (ProductionOrderCreated)
  const event = WorkEventSchema.parse({
    id: uuidv4(),
    type: 'ProductionOrderCreated',
    aggregateId: order.id,
    workshopId: order.workshopId,
    timestamp: new Date().toISOString(),
    payload: { quantity: order.quantityRequested },
    schemaVersion: 1,
  });
  await eventRepo.append(event);

  // Enqueue to outbox
  const outboxRepo = new OutboxRepositoryDexie();
  const outboxEvent = OutboxEventSchema.parse({
    ...event,
    status: 'pending' as const,
  });
  await outboxRepo.enqueue(outboxEvent);

  return order;
}

export type OrdersListVM = {
  orderId: string;
  productId: string;
  productName: string;
  productSku?: string;
  targetPieces: number;
  completedPieces: number;
  wipPieces: number;
  processedPieces: number;
  scrapPieces: number;
  completionPercent: number;
  updatedAt?: string;
};

export async function fetchOrdersList(): Promise<OrdersListVM[]> {
  const orders = await orderRepo.listAll();
  // Note: currently we don't have multi-workshop listing; listing all orders for demo purposes
  
  // Fetch all products in one batch to avoid N+1
  const productIds = [...new Set(orders.map((o) => o.productId))];
  const products = await Promise.all(productIds.map((id) => productRepo.getById(id)));
  const productMap = new Map(products.filter((p): p is NonNullable<typeof p> => p !== undefined).map((p) => [p.id, p]));

  const vms = await Promise.all(
    orders.map(async (o) => {
      const events = await eventRepo.listByAggregate(o.id);
      const progress = computeOrderProgressFromEvents({ id: o.id, quantityRequested: o.quantityRequested }, (o.routingVersionSnapshot as any) ?? { id: '', operations: [] }, events);
      const product = productMap.get(o.productId);
      return {
        orderId: o.id,
        productId: o.productId,
        productName: product?.name ?? `Product (${o.productId.slice(0, 8)}...)`,
        productSku: product?.sku,
        targetPieces: progress.targetPieces,
        completedPieces: progress.completedPieces,
        wipPieces: progress.wipPieces,
        processedPieces: progress.processedPieces,
        scrapPieces: progress.scrapPieces,
        completionPercent: progress.completionPercent,
        updatedAt: undefined
      } as OrdersListVM;
    })
  );
  return vms;
}

export type OrderDetailVM = {
  order: ProductionOrder;
  stages: Array<{
    operationId: string;
    operationName?: string;
    sequence: number;
    donePieces: number;
    scrapPieces: number;
    standardMinutesProduced: number;
  }>;
  processedPieces: number;
  completedPieces: number;
  wipPieces: number;
  completionPercent: number;
  avgStageProgress?: number;
};

export async function fetchOrderDetail(orderId: string): Promise<OrderDetailVM | null> {
  const order = await orderRepo.getById(orderId);
  if (!order) return null;
  const events = await eventRepo.listByAggregate(orderId);
  const routingSnapshot = (order.routingVersionSnapshot as any) ?? { id: '', operations: [] };
  
  // Compute order progress to get correct completionPercent
  const progress = computeOrderProgressFromEvents(
    { id: order.id, quantityRequested: order.quantityRequested },
    routingSnapshot,
    events
  );
  
  const stages = computeStageTotalsFromEvents(routingSnapshot, events);
  
  // Fetch operation names to enrich stages
  const operationIds = [...new Set(stages.map((s) => s.operationId))];
  const operations = await Promise.all(operationIds.map((id) => operationRepo.getById(id)));
  const operationMap = new Map(operations.filter((op): op is NonNullable<typeof op> => op !== undefined).map((op) => [op.id, op]));

  const enrichedStages = stages.map((stage) => {
    const operation = operationMap.get(stage.operationId);
    return {
      ...stage,
      operationName: operation?.name,
    };
  });

  return {
    order,
    stages: enrichedStages,
    processedPieces: progress.processedPieces,
    completedPieces: progress.completedPieces,
    wipPieces: progress.wipPieces,
    completionPercent: progress.completionPercent,
    avgStageProgress: progress.avgStageProgress,
  };
}
