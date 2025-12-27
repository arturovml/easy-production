import create from 'zustand';
import { RoutingRepositoryDexie } from '../data/dexie/routingRepositoryDexie';
import { RoutingVersion, RoutingOperation } from '../shared/schemas';

interface RoutingState {
  versions: Record<string, RoutingVersion[]>;
  operations: Record<string, RoutingOperation[]>;
  loadVersionsForProduct: (productId: string) => Promise<void>;
  loadOpsForVersion: (routingVersionId: string) => Promise<void>;
}

const routingRepo = new RoutingRepositoryDexie();

export const useRoutingStore = create<RoutingState>((set, get) => ({
  versions: {},
  operations: {},
  loadVersionsForProduct: async (productId: string) => {
    const versions = await routingRepo.listRoutingVersionsByProduct(productId);
    set((s) => ({ versions: { ...s.versions, [productId]: versions } }));
  },
  loadOpsForVersion: async (routingVersionId: string) => {
    const ops = await routingRepo.listRoutingOperationsByVersion(routingVersionId);
    set((s) => ({ operations: { ...s.operations, [routingVersionId]: ops } }));
  }
}));