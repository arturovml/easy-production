import create from 'zustand';
import { Product, Operation, WorkCenter, Operator } from '../shared/schemas';
import { ProductRepositoryDexie } from '../data/dexie/productRepositoryDexie';
import { OperationRepositoryDexie } from '../data/dexie/operationRepositoryDexie';

interface CatalogState {
  products: Product[];
  operations: Operation[];
  workCenters: WorkCenter[];
  operators: Operator[];
  loadAll: () => Promise<void>;
}

const productRepo = new ProductRepositoryDexie();
const operationRepo = new OperationRepositoryDexie();

export const useCatalogStore = create<CatalogState>((set) => ({
  products: [],
  operations: [],
  workCenters: [],
  operators: [],
  loadAll: async () => {
    const [products, operations] = await Promise.all([productRepo.list(), operationRepo.list()]);
    set({ products, operations });
  }
}));