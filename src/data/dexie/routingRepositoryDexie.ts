import { RoutingVersion, RoutingOperation } from '../../shared/schemas';
import { db as globalDb, AppDB } from '../../infra/dexie/db';

export interface RoutingRepository {
  addRoutingVersion(rv: RoutingVersion): Promise<void>;
  addRoutingOperation(ro: RoutingOperation): Promise<void>;
  listRoutingVersionsByProduct(productId: string): Promise<RoutingVersion[]>;
  listRoutingOperationsByVersion(routingVersionId: string): Promise<RoutingOperation[]>;
}

export class RoutingRepositoryDexie implements RoutingRepository {
  private db: AppDB;
  constructor(dbInstance: AppDB = globalDb) {
    this.db = dbInstance;
  }

  async addRoutingVersion(rv: RoutingVersion): Promise<void> {
    await this.db.routingVersions.add(rv);
  }
  async addRoutingOperation(ro: RoutingOperation): Promise<void> {
    await this.db.routingOperations.add(ro);
  }
  async listRoutingVersionsByProduct(productId: string): Promise<RoutingVersion[]> {
    return this.db.routingVersions.where('productId').equals(productId).toArray();
  }
  async listRoutingOperationsByVersion(routingVersionId: string): Promise<RoutingOperation[]> {
    return this.db.routingOperations.where('routingVersionId').equals(routingVersionId).sortBy('sequence');
  }
}
