import { Lot } from '../../shared/schemas';
import { db as globalDb, AppDB } from '../../infra/dexie/db';

export interface LotRepository {
  add(lot: Lot): Promise<void>;
  createMany(lots: Lot[]): Promise<void>;
  getById(id: string): Promise<Lot | undefined>;
  listByOrderId(orderId: string): Promise<Lot[]>;
  listByProduct(productId: string): Promise<Lot[]>; // Legacy method, kept for compatibility
  listAll(): Promise<Lot[]>;
}

export class LotRepositoryDexie implements LotRepository {
  private db: AppDB;
  constructor(dbInstance: AppDB = globalDb) {
    this.db = dbInstance;
  }

  async add(lot: Lot): Promise<void> {
    await this.db.lots.add(lot);
  }

  async createMany(lots: Lot[]): Promise<void> {
    await this.db.lots.bulkAdd(lots);
  }

  async getById(id: string): Promise<Lot | undefined> {
    return this.db.lots.get(id);
  }

  async listByOrderId(orderId: string): Promise<Lot[]> {
    return this.db.lots.where('orderId').equals(orderId).sortBy('lotNumber');
  }

  async listByProduct(productId: string): Promise<Lot[]> {
    // Legacy method: only returns lots with productId (old data)
    return this.db.lots.where('productId').equals(productId).toArray();
  }

  async listAll(): Promise<Lot[]> {
    return this.db.lots.toArray();
  }
}

