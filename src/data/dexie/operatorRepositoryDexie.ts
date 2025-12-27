import { Operator } from '../../shared/schemas';
import { db as globalDb, AppDB } from '../../infra/dexie/db';
import { OperatorRepository } from '../../domain/repositories/operatorRepository';

export class OperatorRepositoryDexie implements OperatorRepository {
  private db: AppDB;
  constructor(dbInstance: AppDB = globalDb) {
    this.db = dbInstance;
  }

  async add(op: Operator): Promise<void> {
    await this.db.operators.add(op);
  }
  async getById(id: string): Promise<Operator | undefined> {
    return this.db.operators.get(id);
  }
  async list(): Promise<Operator[]> {
    return this.db.operators.toArray();
  }
}
