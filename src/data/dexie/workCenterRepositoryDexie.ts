import { WorkCenter } from '../../shared/schemas';
import { db as globalDb, AppDB } from '../../infra/dexie/db';
import { WorkCenterRepository } from '../../domain/repositories/workCenterRepository';

export class WorkCenterRepositoryDexie implements WorkCenterRepository {
  private db: AppDB;
  constructor(dbInstance: AppDB = globalDb) {
    this.db = dbInstance;
  }

  async add(wc: WorkCenter): Promise<void> {
    await this.db.workCenters.add(wc);
  }
  async update(id: string, updates: Partial<WorkCenter>): Promise<void> {
    await this.db.workCenters.update(id, updates);
  }
  async getById(id: string): Promise<WorkCenter | undefined> {
    return this.db.workCenters.get(id);
  }
  async list(): Promise<WorkCenter[]> {
    return this.db.workCenters.toArray();
  }
}
