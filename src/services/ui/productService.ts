import { v4 as uuidv4 } from 'uuid';
import { Product, ProductSchema } from '../../shared/schemas';
import { ProductRepositoryDexie } from '../../data/dexie/productRepositoryDexie';

const productRepo = new ProductRepositoryDexie();

export async function fetchProducts(): Promise<Product[]> {
  return productRepo.list();
}

export async function fetchProductById(id: string): Promise<Product | undefined> {
  return productRepo.getById(id);
}

export type CreateProductInput = {
  name: string;
  sku?: string;
};

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const product = ProductSchema.parse({
    id: uuidv4(),
    sku: input.sku || '',
    name: input.name,
  });
  await productRepo.add(product);
  return product;
}

export type UpdateProductInput = {
  name?: string;
  sku?: string;
  activeRoutingVersionId?: string;
};

export async function updateProduct(id: string, input: UpdateProductInput): Promise<void> {
  await productRepo.update(id, input);
}

