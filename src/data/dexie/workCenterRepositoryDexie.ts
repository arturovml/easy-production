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
  async getById(id: string): Promise<WorkCenter | undefined> {
    return this.db.workCenters.get(id);
  }
  async list(): Promise<WorkCenter[]> {
    return this.db.workCenters.toArray();
  }
}
