import { ProductionOrder } from '../../shared/schemas';
import { ProductionOrderRepositoryDexie } from '../../data/dexie/workOrderRepositoryDexie';
import { EventRepositoryDexie } from '../../data/dexie/eventRepositoryDexie';
import { computeOrderProgressFromEvents, computeStageTotalsFromEvents } from '../../domain/services/aggregation';

const orderRepo = new ProductionOrderRepositoryDexie();
const eventRepo = new EventRepositoryDexie();

export type OrdersListVM = {
  orderId: string;
  productId: string;
  targetPieces: number;
  donePieces: number;
  scrapPieces: number;
  completionPercent: number;
  updatedAt?: string;
};

export async function fetchOrdersList(): Promise<OrdersListVM[]> {
  const orders = await orderRepo.listAll();
  // Note: currently we don't have multi-workshop listing; listing all orders for demo purposes
  const vms = await Promise.all(
    orders.map(async (o) => {
      const events = await eventRepo.listByAggregate(o.id);
      const progress = computeOrderProgressFromEvents({ id: o.id, quantityRequested: o.quantityRequested }, (o.routingVersionSnapshot as any) ?? { id: '', operations: [] }, events);
      return {
        orderId: o.id,
        productId: o.productId,
        targetPieces: progress.targetPieces,
        donePieces: progress.donePieces,
        scrapPieces: progress.scrapPieces,
        completionPercent: progress.completionPercent,
        updatedAt: undefined
      } as OrdersListVM;
    })
  );
  return vms;
}

export async function fetchOrderDetail(orderId: string) {
  const order = await orderRepo.getById(orderId);
  if (!order) return null;
  const events = await eventRepo.listByAggregate(orderId);
  const stages = computeStageTotalsFromEvents((order.routingVersionSnapshot as any) ?? { id: '', operations: [] }, events);
  return {
    order,
    stages
  };
}
