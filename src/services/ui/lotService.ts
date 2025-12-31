import { Lot } from '../../shared/schemas';
import { LotRepositoryDexie } from '../../data/dexie/lotRepositoryDexie';

const lotRepo = new LotRepositoryDexie();

export async function getLotsForOrder(orderId: string): Promise<Lot[]> {
  return lotRepo.listByOrderId(orderId);
}

