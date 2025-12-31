import { WorkEvent } from '../../shared/schemas';

type RoutingOperation = {
  operationId: string;
  sequence: number;
};

type LotInput = {
  id: string;
  lotNumber: number;
  plannedPieces: number;
};

export type LotProgress = {
  lotId: string;
  lotNumber: number;
  plannedPieces: number;
  donePieces: number;
  scrapPieces: number;
  remainingPieces: number;
  status: 'not_started' | 'in_progress' | 'done';
  overProduced: boolean;
  wipPieces?: number;
};

// Helper to safely extract values from event payload
function getPayloadValue(payload: Record<string, unknown> | undefined, key: string): unknown {
  if (!payload) return undefined;
  return payload[key];
}

function getStringValue(payload: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = getPayloadValue(payload, key);
  if (typeof value === 'string') return value;
  return undefined;
}

function getNumberValue(payload: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = getPayloadValue(payload, key);
  if (typeof value === 'number' && !isNaN(value)) return value;
  return undefined;
}

export function computeLotProgressFromEvents(
  lots: LotInput[],
  routingOps: RoutingOperation[],
  events: WorkEvent[]
): Map<string, LotProgress> {
  const result = new Map<string, LotProgress>();

  if (routingOps.length === 0) {
    // No routing operations, all lots are not_started
    lots.forEach((lot) => {
      result.set(lot.id, {
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        plannedPieces: lot.plannedPieces,
        donePieces: 0,
        scrapPieces: 0,
        remainingPieces: lot.plannedPieces,
        status: 'not_started',
        overProduced: false,
        wipPieces: 0,
      });
    });
    return result;
  }

  // Find last operation (max sequence)
  const lastOperation = routingOps.reduce((max, op) => (op.sequence > max.sequence ? op : max));
  const lastOperationId = lastOperation.operationId;

  // Process each lot
  lots.forEach((lot) => {
    // Filter events for this lot
    const lotEvents = events.filter((e) => {
      const eventLotId = getStringValue(e.payload, 'lotId');
      return eventLotId === lot.id;
    });

    if (lotEvents.length === 0) {
      // No events for this lot
      result.set(lot.id, {
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        plannedPieces: lot.plannedPieces,
        donePieces: 0,
        scrapPieces: 0,
        remainingPieces: lot.plannedPieces,
        status: 'not_started',
        overProduced: false,
        wipPieces: 0,
      });
      return;
    }

    // Calculate done pieces from last operation only
    const lastOpEvents = lotEvents.filter((e) => {
      const operationId = getStringValue(e.payload, 'operationId');
      return operationId === lastOperationId;
    });

    const donePieces = lastOpEvents.reduce((sum, e) => {
      const qtyDone = getNumberValue(e.payload, 'qtyDone') ?? 0;
      return sum + qtyDone;
    }, 0);

    const scrapPieces = lastOpEvents.reduce((sum, e) => {
      const qtyScrap = getNumberValue(e.payload, 'qtyScrap') ?? 0;
      return sum + qtyScrap;
    }, 0);

    // Calculate WIP: max done across all operations for this lot minus donePieces
    const doneByOperation = new Map<string, number>();
    lotEvents.forEach((e) => {
      const operationId = getStringValue(e.payload, 'operationId');
      if (operationId) {
        const qtyDone = getNumberValue(e.payload, 'qtyDone') ?? 0;
        const current = doneByOperation.get(operationId) ?? 0;
        doneByOperation.set(operationId, current + qtyDone);
      }
    });
    const maxDoneAnyOp = Math.max(...Array.from(doneByOperation.values()), 0);
    const wipPieces = Math.max(0, maxDoneAnyOp - donePieces);

    // Check if there's intermediate progress (any operation other than last has done pieces)
    const hasIntermediateProgress = Array.from(doneByOperation.entries()).some(
      ([opId, qty]) => opId !== lastOperationId && qty > 0
    );

    // Calculate remaining pieces
    const remainingPieces = Math.max(0, lot.plannedPieces - donePieces);

    // Determine status
    let status: 'not_started' | 'in_progress' | 'done';
    if (donePieces === 0 && !hasIntermediateProgress) {
      status = 'not_started';
    } else if (donePieces >= lot.plannedPieces) {
      status = 'done';
    } else {
      status = 'in_progress';
    }

    const overProduced = donePieces > lot.plannedPieces;

    result.set(lot.id, {
      lotId: lot.id,
      lotNumber: lot.lotNumber,
      plannedPieces: lot.plannedPieces,
      donePieces,
      scrapPieces,
      remainingPieces,
      status,
      overProduced,
      wipPieces,
    });
  });

  return result;
}

