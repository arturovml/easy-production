import { Lot } from '../../shared/schemas';
import { db as globalDb, AppDB } from '../../infra/dexie/db';

export interface LotRepository {
  add(lot: Lot): Promise<void>;
  getById(id: string): Promise<Lot | undefined>;
  listByProduct(productId: string): Promise<Lot[]>;
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

  async getById(id: string): Promise<Lot | undefined> {
    return this.db.lots.get(id);
  }

  async listByProduct(productId: string): Promise<Lot[]> {
    return this.db.lots.where('productId').equals(productId).toArray();
  }

  async listAll(): Promise<Lot[]> {
    return this.db.lots.toArray();
  }
}

