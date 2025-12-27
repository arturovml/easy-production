import create from 'zustand';
import { ProductionOrder } from '../shared/schemas';
import { ProductionOrderRepositoryDexie } from '../data/dexie/workOrderRepositoryDexie';

interface OrderState {
  orders: ProductionOrder[];
  loadByWorkshop: (workshopId: string) => Promise<void>;
  addOrder: (order: ProductionOrder) => Promise<void>;
}

const orderRepo = new ProductionOrderRepositoryDexie();

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  loadByWorkshop: async (workshopId: string) => {
    const orders = await orderRepo.listByWorkshop(workshopId);
    set({ orders });
  },
  addOrder: async (order: ProductionOrder) => {
    await orderRepo.add(order);
    set((s) => ({ orders: [...s.orders, order] }));
  }
}));