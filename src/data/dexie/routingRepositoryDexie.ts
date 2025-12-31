import { RoutingVersion, RoutingOperation } from '../../shared/schemas';
import { db as globalDb, AppDB } from '../../infra/dexie/db';

export interface RoutingRepository {
  addRoutingVersion(rv: RoutingVersion): Promise<void>;
  updateRoutingVersion(id: string, updates: Partial<RoutingVersion>): Promise<void>;
  getRoutingVersionById(id: string): Promise<RoutingVersion | undefined>;
  addRoutingOperation(ro: RoutingOperation): Promise<void>;
  updateRoutingOperation(id: string, updates: Partial<RoutingOperation>): Promise<void>;
  deleteRoutingOperation(id: string): Promise<void>;
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
  async updateRoutingVersion(id: string, updates: Partial<RoutingVersion>): Promise<void> {
    await this.db.routingVersions.update(id, updates);
  }
  async getRoutingVersionById(id: string): Promise<RoutingVersion | undefined> {
    return this.db.routingVersions.get(id);
  }
  async addRoutingOperation(ro: RoutingOperation): Promise<void> {
    await this.db.routingOperations.add(ro);
  }
  async updateRoutingOperation(id: string, updates: Partial<RoutingOperation>): Promise<void> {
    await this.db.routingOperations.update(id, updates);
  }
  async deleteRoutingOperation(id: string): Promise<void> {
    await this.db.routingOperations.delete(id);
  }
  async listRoutingVersionsByProduct(productId: string): Promise<RoutingVersion[]> {
    return this.db.routingVersions.where('productId').equals(productId).toArray();
  }
  async listRoutingOperationsByVersion(routingVersionId: string): Promise<RoutingOperation[]> {
    return this.db.routingOperations.where('routingVersionId').equals(routingVersionId).sortBy('sequence');
  }
}
