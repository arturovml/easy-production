import { WorkEvent } from '../../shared/schemas';
import { StageProgressVM, OrderProgressVM } from '../viewModels';

type RoutingOperationSnapshot = {
  operationId: string;
  sequence: number;
  standardMinutes?: number; // minutes per good piece
};

type RoutingSnapshot = {
  id: string;
  productId: string;
  operations: RoutingOperationSnapshot[];
};

export function computeStageTotalsFromEvents(routingSnapshot: RoutingSnapshot, events: WorkEvent[]): StageProgressVM[] {
  // For each routing operation, compute totals
  return routingSnapshot.operations.map((op) => {
    const relevantEvents = events.filter((e) => (e.payload as any)?.operationId === op.operationId);
    const donePieces = relevantEvents.reduce((s, e) => s + ((e.payload as any)?.qtyDone ?? 0), 0);
    const scrapPieces = relevantEvents.reduce((s, e) => s + ((e.payload as any)?.qtyScrap ?? 0), 0);
    const goodPieces = Math.max(0, donePieces - scrapPieces);
    const standardMinutesProduced = (op.standardMinutes ?? 0) * goodPieces;
    return {
      operationId: op.operationId,
      sequence: op.sequence,
      donePieces,
      scrapPieces,
      standardMinutesProduced
    } as StageProgressVM;
  });
}

export function computeScrapTotalsFromEvents(events: WorkEvent[]) {
  return events.reduce((s, e) => s + ((e.payload as any)?.qtyScrap ?? 0), 0);
}

export function computeStandardMinutesProduced(routingSnapshot: RoutingSnapshot, events: WorkEvent[]) {
  const stages = computeStageTotalsFromEvents(routingSnapshot, events);
  return stages.reduce((s, st) => s + st.standardMinutesProduced, 0);
}

export function computeOrderProgressFromEvents(
  order: { id: string; quantityRequested: number },
  routingSnapshot: RoutingSnapshot,
  events: WorkEvent[]
): OrderProgressVM {
  // Compute stage totals first to get donePieces per operation
  const stages = computeStageTotalsFromEvents(routingSnapshot, events);
  
  // Find the last operation (max sequence)
  const lastOperation = routingSnapshot.operations.length > 0
    ? routingSnapshot.operations.reduce((max, op) => op.sequence > max.sequence ? op : max)
    : null;
  
  // Get donePieces from the last operation
  const lastOperationStage = lastOperation
    ? stages.find((s) => s.operationId === lastOperation.operationId)
    : null;
  const completedPieces = lastOperationStage?.donePieces ?? 0;
  
  // Processed pieces = sum of donePieces across all operations
  const processedPieces = stages.reduce((s, st) => s + st.donePieces, 0);
  
  // WIP pieces = max(stageDone) - completedPieces, clamped >= 0
  const maxStageDone = stages.length > 0 ? Math.max(...stages.map((st) => st.donePieces)) : 0;
  const wipPieces = Math.max(0, maxStageDone - completedPieces);
  
  // Scrap is still total across all operations
  const scrapPieces = computeScrapTotalsFromEvents(events);
  const targetPieces = order.quantityRequested;
  
  // Completion percent based on last operation
  const completionPercent = targetPieces > 0 ? Math.min(100, (completedPieces / targetPieces) * 100) : 0;
  
  // Optional: Average stage progress
  const avgStageProgress = stages.length > 0 && targetPieces > 0
    ? stages.reduce((sum, st) => {
        const stageProgress = Math.min(100, (st.donePieces / targetPieces) * 100);
        return sum + stageProgress;
      }, 0) / stages.length
    : undefined;
  
  const standardMinutesProducedTotal = computeStandardMinutesProduced(routingSnapshot, events);
  
  return {
    orderId: order.id,
    targetPieces,
    processedPieces,
    completedPieces,
    wipPieces,
    scrapPieces,
    completionPercent,
    avgStageProgress,
    standardMinutesProducedTotal
  } as OrderProgressVM;
}

export function computeEfficiencyPercent(standardMinutesProduced: number, workedMinutes: number | null): number | null {
  if (workedMinutes == null) {
    // TODO: workedMinutes is not present in WorkEvent model yet; return null and add TODO for future acquisition
    return null;
  }
  if (workedMinutes === 0) return null;
  return (standardMinutesProduced / workedMinutes) * 100;
}
