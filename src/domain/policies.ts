import { WorkEvent } from '../shared/schemas';
import { ProductionOrder, RoutingVersion } from '../shared/schemas';

export function validateEventAgainstOrder(event: WorkEvent, order: ProductionOrder): boolean {
  const payload: any = event.payload ?? {};
  const qtyDone = typeof payload.qtyDone === 'number' ? payload.qtyDone : 0;
  const qtyScrap = typeof payload.qtyScrap === 'number' ? payload.qtyScrap : 0;

  // basic checks
  if (qtyDone <= 0 && qtyScrap <= 0) return false;
  if (qtyScrap > qtyDone) return false;
  // More checks could be added (e.g., ensure not exceeding order quantity) — TODO
  return true;
}

export function validateEventAgainstRouting(event: WorkEvent, routingSnapshot: { operations: Array<{ operationId: string }> }): boolean {
  const payload: any = event.payload ?? {};
  const operationId = payload.operationId;
  if (!operationId) return false;
  return routingSnapshot.operations.some((o) => o.operationId === operationId);
}
