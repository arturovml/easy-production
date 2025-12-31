import Dexie, { Table } from 'dexie';
import {
  Product,
  Operation,
  RoutingOperation,
  RoutingVersion,
  WorkCenter,
  Operator,
  ProductionOrder,
  Lot,
  WorkEvent,
  OutboxEvent
} from '../../shared/schemas';

export class AppDB extends Dexie {
  products!: Table<Product, string>;
  operations!: Table<Operation, string>;
  routingVersions!: Table<RoutingVersion, string>;
  routingOperations!: Table<RoutingOperation, string>;
  workCenters!: Table<WorkCenter, string>;
  operators!: Table<Operator, string>;
  productionOrders!: Table<ProductionOrder, string>;
  lots!: Table<Lot, string>;
  workEvents!: Table<WorkEvent, string>;
  outboxEvents!: Table<OutboxEvent, string>;

  constructor(dbName = 'EasyProductionDB') {
    super(dbName);

    // Version 1 schema
    this.version(1).stores({
      products: 'id, sku, name',
      operations: 'id, code, name',
      routingVersions: 'id, productId, version',
      routingOperations: 'id, routingVersionId, sequence',
      workCenters: 'id, name',
      operators: 'id, name',
      productionOrders: 'id, productId, workshopId',
      lots: 'id, productId',
      workEvents: 'id, aggregateId, workshopId, timestamp',
      outboxEvents: 'id, status, workshopId, timestamp'
    });

    // Version 2: Add orderId to lots and trackingMode to orders
    this.version(2)
      .stores({
        lots: 'id, orderId, productId', // Add orderId index, keep productId for legacy
        productionOrders: 'id, productId, workshopId, trackingMode' // Add trackingMode index
      })
      .upgrade(async (tx) => {
        // Migration: existing lots without orderId are left as legacy (no auto-inference)
        // Existing orders without trackingMode default to 'piece' (handled by schema default)
        // No data transformation needed - schema defaults handle it
      });

    // Migrate hooks and future versions can be added later.
  }
}

export const db = new AppDB();
