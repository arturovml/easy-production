import { ProductRepository } from '../../domain/repositories/productRepository';
import { db as globalDb, AppDB } from '../../infra/dexie/db';
import { Product } from '../../shared/schemas';

export class ProductRepositoryDexie implements ProductRepository {
  private db: AppDB;
  constructor(dbInstance: AppDB = globalDb) {
    this.db = dbInstance;
  }

  async add(product: Product): Promise<void> {
    try {
      await this.db.products.add(product);
    } catch (err) {
      // If already exists, throw
      throw err;
    }
  }

  async getById(id: string): Promise<Product | undefined> {
    return this.db.products.get(id);
  }

  async list(): Promise<Product[]> {
    return this.db.products.toArray();
  }
}
