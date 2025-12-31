import { describe, it, expect } from 'vitest';
import { computeLotProgressFromEvents } from '../domain/services/lotProgress';
import { WorkEvent, WorkEventSchema } from '../shared/schemas';
import { v4 as uuidv4 } from 'uuid';

function makeEvent(overrides: {
  lotId?: string;
  operationId: string;
  qtyDone: number;
  qtyScrap?: number;
}): WorkEvent {
  const payload: Record<string, unknown> = {
    operationId: overrides.operationId,
    qtyDone: overrides.qtyDone,
    operatorId: uuidv4(),
  };
  if (overrides.lotId) {
    payload.lotId = overrides.lotId;
  }
  if (overrides.qtyScrap !== undefined) {
    payload.qtyScrap = overrides.qtyScrap;
  }

  return WorkEventSchema.parse({
    id: uuidv4(),
    type: 'OperationRecorded',
    aggregateId: uuidv4(),
    workshopId: uuidv4(),
    timestamp: new Date().toISOString(),
    payload,
    schemaVersion: 1,
  });
}

describe('computeLotProgressFromEvents', () => {
  const op1 = { operationId: 'op-1', sequence: 1 };
  const op2 = { operationId: 'op-2', sequence: 2 };
  const op3 = { operationId: 'op-3', sequence: 3 };
  const op4 = { operationId: 'op-4', sequence: 4 }; // Last operation (Assemble)
  const routingOps = [op1, op2, op3, op4];

  it('computes lot progress: in_progress when intermediate ops have done but last op has 0', () => {
    const lot = { id: 'lot-1', lotNumber: 1, plannedPieces: 12 };
    const events = [
      makeEvent({ lotId: 'lot-1', operationId: op1.operationId, qtyDone: 12 }), // Cut
      makeEvent({ lotId: 'lot-1', operationId: op2.operationId, qtyDone: 12 }), // Drill
      makeEvent({ lotId: 'lot-1', operationId: op3.operationId, qtyDone: 12 }), // Deburr
      // op4 (Assemble) has 0 done
    ];

    const result = computeLotProgressFromEvents([lot], routingOps, events);
    const progress = result.get('lot-1');

    expect(progress).toBeDefined();
    expect(progress?.donePieces).toBe(0); // Last operation has 0
    expect(progress?.status).toBe('in_progress'); // Because there's intermediate progress
    expect(progress?.wipPieces).toBe(12); // max(12,12,12,0) - 0 = 12
    expect(progress?.remainingPieces).toBe(12);
    expect(progress?.overProduced).toBe(false);
  });

  it('computes lot progress: done when last operation has done >= planned', () => {
    const lot = { id: 'lot-1', lotNumber: 1, plannedPieces: 12 };
    const events = [
      makeEvent({ lotId: 'lot-1', operationId: op1.operationId, qtyDone: 12 }),
      makeEvent({ lotId: 'lot-1', operationId: op2.operationId, qtyDone: 12 }),
      makeEvent({ lotId: 'lot-1', operationId: op3.operationId, qtyDone: 12 }),
      makeEvent({ lotId: 'lot-1', operationId: op4.operationId, qtyDone: 12 }), // Last op: 12 done
    ];

    const result = computeLotProgressFromEvents([lot], routingOps, events);
    const progress = result.get('lot-1');

    expect(progress).toBeDefined();
    expect(progress?.donePieces).toBe(12); // From last operation
    expect(progress?.status).toBe('done');
    expect(progress?.remainingPieces).toBe(0);
    expect(progress?.overProduced).toBe(false);
    expect(progress?.wipPieces).toBe(0); // max(12,12,12,12) - 12 = 0
  });

  it('computes lot progress: overProduced when done > planned', () => {
    const lot = { id: 'lot-1', lotNumber: 1, plannedPieces: 12 };
    const events = [
      makeEvent({ lotId: 'lot-1', operationId: op4.operationId, qtyDone: 13 }), // Last op: 13 done (over)
    ];

    const result = computeLotProgressFromEvents([lot], routingOps, events);
    const progress = result.get('lot-1');

    expect(progress).toBeDefined();
    expect(progress?.donePieces).toBe(13);
    expect(progress?.status).toBe('done');
    expect(progress?.overProduced).toBe(true);
    expect(progress?.remainingPieces).toBe(0); // Clamped to 0
  });

  it('computes lot progress: remainder lot (small planned)', () => {
    const lot = { id: 'lot-1', lotNumber: 1, plannedPieces: 3 }; // Remainder lot
    const events = [
      makeEvent({ lotId: 'lot-1', operationId: op4.operationId, qtyDone: 3 }), // Last op: 3 done
    ];

    const result = computeLotProgressFromEvents([lot], routingOps, events);
    const progress = result.get('lot-1');

    expect(progress).toBeDefined();
    expect(progress?.donePieces).toBe(3);
    expect(progress?.status).toBe('done');
    expect(progress?.remainingPieces).toBe(0);
    expect(progress?.overProduced).toBe(false);
  });

  it('ignores events without lotId', () => {
    const lot = { id: 'lot-1', lotNumber: 1, plannedPieces: 12 };
    const events = [
      makeEvent({ operationId: op4.operationId, qtyDone: 10 }), // No lotId
      makeEvent({ lotId: 'lot-1', operationId: op4.operationId, qtyDone: 5 }), // With lotId
    ];

    const result = computeLotProgressFromEvents([lot], routingOps, events);
    const progress = result.get('lot-1');

    expect(progress).toBeDefined();
    expect(progress?.donePieces).toBe(5); // Only counts event with lotId
  });

  it('ignores events with invalid payload (does not crash)', () => {
    const lot = { id: 'lot-1', lotNumber: 1, plannedPieces: 12 };
    const validEvent = makeEvent({ lotId: 'lot-1', operationId: op4.operationId, qtyDone: 5 });
    const invalidEvents: WorkEvent[] = [
      WorkEventSchema.parse({
        id: uuidv4(),
        type: 'OperationRecorded',
        aggregateId: uuidv4(),
        workshopId: uuidv4(),
        timestamp: new Date().toISOString(),
        payload: { lotId: 'lot-1', operationId: op4.operationId, qtyDone: 'not-a-number' }, // Invalid
        schemaVersion: 1,
      }),
      WorkEventSchema.parse({
        id: uuidv4(),
        type: 'OperationRecorded',
        aggregateId: uuidv4(),
        workshopId: uuidv4(),
        timestamp: new Date().toISOString(),
        payload: { lotId: 'lot-1', qtyDone: 3 }, // Missing operationId
        schemaVersion: 1,
      }),
    ];

    const result = computeLotProgressFromEvents([lot], routingOps, [...invalidEvents, validEvent]);
    const progress = result.get('lot-1');

    expect(progress).toBeDefined();
    expect(progress?.donePieces).toBe(5); // Only counts valid event
  });

  it('handles multiple lots correctly', () => {
    const lot1 = { id: 'lot-1', lotNumber: 1, plannedPieces: 12 };
    const lot2 = { id: 'lot-2', lotNumber: 2, plannedPieces: 12 };
    const events = [
      makeEvent({ lotId: 'lot-1', operationId: op4.operationId, qtyDone: 12 }),
      makeEvent({ lotId: 'lot-2', operationId: op4.operationId, qtyDone: 8 }),
    ];

    const result = computeLotProgressFromEvents([lot1, lot2], routingOps, events);
    const progress1 = result.get('lot-1');
    const progress2 = result.get('lot-2');

    expect(progress1?.donePieces).toBe(12);
    expect(progress1?.status).toBe('done');
    expect(progress2?.donePieces).toBe(8);
    expect(progress2?.status).toBe('in_progress');
  });

  it('calculates scrap pieces from last operation', () => {
    const lot = { id: 'lot-1', lotNumber: 1, plannedPieces: 12 };
    const events = [
      makeEvent({ lotId: 'lot-1', operationId: op1.operationId, qtyDone: 12, qtyScrap: 2 }), // Intermediate
      makeEvent({ lotId: 'lot-1', operationId: op4.operationId, qtyDone: 10, qtyScrap: 1 }), // Last op
    ];

    const result = computeLotProgressFromEvents([lot], routingOps, events);
    const progress = result.get('lot-1');

    expect(progress?.scrapPieces).toBe(1); // Only from last operation
    expect(progress?.donePieces).toBe(10); // Only from last operation
  });

  it('handles empty routing operations (all lots not_started)', () => {
    const lot = { id: 'lot-1', lotNumber: 1, plannedPieces: 12 };
    const events = [makeEvent({ lotId: 'lot-1', operationId: 'op-1', qtyDone: 5 })];

    const result = computeLotProgressFromEvents([lot], [], events);
    const progress = result.get('lot-1');

    expect(progress?.status).toBe('not_started');
    expect(progress?.donePieces).toBe(0);
  });
});

