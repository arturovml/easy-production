import { Product } from '../../shared/schemas';

export interface ProductRepository {
  add(product: Product): Promise<void>;
  getById(id: string): Promise<Product | undefined>;
  list(): Promise<Product[]>;
}
