import { v4 as uuidv4 } from 'uuid';
import { db } from '../infra/dexie/db';
import {
  ProductSchema,
  OperationSchema,
  RoutingVersionSchema,
  RoutingOperationSchema,
  WorkCenterSchema,
  OperatorSchema,
  ProductionOrderSchema,
  LotSchema,
  OutboxEventSchema,
  WorkEventSchema
} from '../shared/schemas';

export async function seedDemoData({ trackingMode = 'piece' }: { trackingMode?: 'piece' | 'lot' | 'hybrid' } = {}) {
  // Clear db tables lightly for idempotent seeding in dev
  await Promise.all([
    db.products.clear(),
    db.operations.clear(),
    db.routingVersions.clear(),
    db.routingOperations.clear(),
    db.workCenters.clear(),
    db.operators.clear(),
    db.productionOrders.clear(),
    db.lots.clear(),
    db.workEvents.clear(),
    db.outboxEvents.clear()
  ]);

  // Create products
  const p1 = ProductSchema.parse({ id: uuidv4(), sku: 'P-100', name: 'Widget A' });
  const p2 = ProductSchema.parse({ id: uuidv4(), sku: 'P-200', name: 'Widget B' });
  await db.products.bulkAdd([p1, p2]);

  // Operations
  const ops = [
    { code: 'OP-1', name: 'Cut', durationMinutes: 5 },
    { code: 'OP-2', name: 'Drill', durationMinutes: 10 },
    { code: 'OP-3', name: 'Deburr', durationMinutes: 3 },
    { code: 'OP-4', name: 'Assemble', durationMinutes: 15 },
    { code: 'OP-5', name: 'Paint', durationMinutes: 20 },
    { code: 'OP-6', name: 'Inspect', durationMinutes: 7 }
  ].map((o) => OperationSchema.parse({ id: uuidv4(), ...o }));
  await db.operations.bulkAdd(ops);

  // WorkCenters & Operators
  const wc1 = WorkCenterSchema.parse({ id: uuidv4(), name: 'WC-Alpha' });
  const wc2 = WorkCenterSchema.parse({ id: uuidv4(), name: 'WC-Beta' });
  await db.workCenters.bulkAdd([wc1, wc2]);

  const op1 = OperatorSchema.parse({ id: uuidv4(), name: 'Alice' });
  const op2 = OperatorSchema.parse({ id: uuidv4(), name: 'Bob' });
  await db.operators.bulkAdd([op1, op2]);

  // RoutingVersion per product
  const rv1 = RoutingVersionSchema.parse({ id: uuidv4(), productId: p1.id, version: 1, createdAt: new Date().toISOString() });
  await db.routingVersions.add(rv1);

  // routingOperations ordered
  const routingOps = ops.slice(0, 4).map((o, idx) => RoutingOperationSchema.parse({ id: uuidv4(), routingVersionId: rv1.id, operationId: o.id, sequence: idx + 1 }));
  await db.routingOperations.bulkAdd(routingOps);

  // Production order (use a new UUID workshop id)
  const workshopId = uuidv4();
  const po = ProductionOrderSchema.parse({ id: uuidv4(), productId: p1.id, quantityRequested: 100, workshopId, routingVersionSnapshot: { id: rv1.id, operations: routingOps } });
  await db.productionOrders.add(po);

  // Optional lots if trackingMode in (lot, hybrid)
  if (trackingMode === 'lot' || trackingMode === 'hybrid') {
    const lots = [
      LotSchema.parse({ id: uuidv4(), productId: p1.id, quantity: 30, createdAt: new Date().toISOString() }),
      LotSchema.parse({ id: uuidv4(), productId: p1.id, quantity: 30, createdAt: new Date().toISOString() }),
      LotSchema.parse({ id: uuidv4(), productId: p1.id, quantity: 40, createdAt: new Date().toISOString() })
    ];
    await db.lots.bulkAdd(lots);
  }

  // Initial event
  const ev = WorkEventSchema.parse({ id: uuidv4(), type: 'ProductionOrderCreated', aggregateId: po.id, workshopId: po.workshopId, timestamp: new Date().toISOString(), payload: { quantity: po.quantityRequested }, schemaVersion: 1 });
  await db.workEvents.add(ev);

  const outbox = OutboxEventSchema.parse({ ...ev, status: 'pending' });
  await db.outboxEvents.add(outbox);

  return { products: [p1, p2], operations: ops, productionOrder: po };
}
