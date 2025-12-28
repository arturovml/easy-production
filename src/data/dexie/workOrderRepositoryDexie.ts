import { ProductionOrder } from '../../shared/schemas';
import { db as globalDb, AppDB } from '../../infra/dexie/db';

export interface ProductionOrderRepository {
  add(order: ProductionOrder): Promise<void>;
  getById(id: string): Promise<ProductionOrder | undefined>;
  listByWorkshop(workshopId: string): Promise<ProductionOrder[]>;
  listAll(): Promise<ProductionOrder[]>;
}

export class ProductionOrderRepositoryDexie implements ProductionOrderRepository {
  private db: AppDB;
  constructor(dbInstance: AppDB = globalDb) {
    this.db = dbInstance;
  }

  async add(order: ProductionOrder): Promise<void> {
    await this.db.productionOrders.add(order);
  }
  async getById(id: string): Promise<ProductionOrder | undefined> {
    return this.db.productionOrders.get(id);
  }
  async listByWorkshop(workshopId: string): Promise<ProductionOrder[]> {
    return this.db.productionOrders.where('workshopId').equals(workshopId).toArray();
  }
  async listAll(): Promise<ProductionOrder[]> {
    return this.db.productionOrders.toArray();
  }
}
