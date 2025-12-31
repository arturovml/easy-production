import { Operation } from '../../shared/schemas';
import { db as globalDb, AppDB } from '../../infra/dexie/db';

export interface OperationRepository {
  add(op: Operation): Promise<void>;
  update(id: string, updates: Partial<Operation>): Promise<void>;
  getById(id: string): Promise<Operation | undefined>;
  list(): Promise<Operation[]>;
}

export class OperationRepositoryDexie implements OperationRepository {
  private db: AppDB;
  constructor(dbInstance: AppDB = globalDb) {
    this.db = dbInstance;
  }

  async add(op: Operation): Promise<void> {
    await this.db.operations.add(op);
  }
  async update(id: string, updates: Partial<Operation>): Promise<void> {
    await this.db.operations.update(id, updates);
  }
  async getById(id: string): Promise<Operation | undefined> {
    return this.db.operations.get(id);
  }
  async list(): Promise<Operation[]> {
    return this.db.operations.toArray();
  }
}
