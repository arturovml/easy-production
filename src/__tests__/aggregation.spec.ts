import { describe, it, expect } from 'vitest';
import { computeStageTotalsFromEvents, computeOrderProgressFromEvents, computeStandardMinutesProduced, computeScrapTotalsFromEvents, computeEfficiencyPercent } from '../domain/services/aggregation';
import { WorkEventSchema } from '../shared/schemas';

const op1 = { operationId: 'op-1', sequence: 1, standardMinutes: 5 };
const op2 = { operationId: 'op-2', sequence: 2, standardMinutes: 10 };
const routingSnapshot = { id: 'r1', productId: 'p1', operations: [op1, op2] };

import { v4 as uuidv4 } from 'uuid';

function makeEvent(payload: object) {
  return WorkEventSchema.parse({ id: uuidv4(), type: 'PieceProduced', aggregateId: 'order-1', workshopId: uuidv4(), timestamp: new Date().toISOString(), payload, schemaVersion: 1 });
}

describe('aggregation services', () => {
  it('computes stage totals correctly', () => {
    const events = [
      makeEvent({ operationId: op1.operationId, qtyDone: 3, qtyScrap: 1 }),
      makeEvent({ operationId: op1.operationId, qtyDone: 2 }),
      makeEvent({ operationId: op2.operationId, qtyDone: 4, qtyScrap: 2 })
    ];

    const stages = computeStageTotalsFromEvents(routingSnapshot, events);
    expect(stages.length).toBe(2);
    const s1 = stages.find((s) => s.operationId === op1.operationId)!;
    expect(s1.donePieces).toBe(5); // 3 + 2
    expect(s1.scrapPieces).toBe(1);
    expect(s1.standardMinutesProduced).toBe((5 - 1) * 5); // good pieces * standard minutes

    const s2 = stages.find((s) => s.operationId === op2.operationId)!;
    expect(s2.donePieces).toBe(4);
    expect(s2.scrapPieces).toBe(2);
    expect(s2.standardMinutesProduced).toBe((4 - 2) * 10);
  });

  it('computes order progress totals correctly', () => {
    const events = [
      makeEvent({ operationId: op1.operationId, qtyDone: 3, qtyScrap: 1 }),
      makeEvent({ operationId: op2.operationId, qtyDone: 2 })
    ];
    const order = { id: 'order-1', quantityRequested: 10 };
    const progress = computeOrderProgressFromEvents(order, routingSnapshot, events);
    expect(progress.orderId).toBe(order.id);
    expect(progress.targetPieces).toBe(10);
    expect(progress.processedPieces).toBe(5); // Total: 3 + 2
    expect(progress.completedPieces).toBe(2); // Last operation (op2) has 2 donePieces
    expect(progress.wipPieces).toBe(1); // max(3, 2) - 2 = 1
    expect(progress.scrapPieces).toBe(1);
    // Completion is based on last operation (op2, sequence 2) which has 2 donePieces
    expect(progress.completionPercent).toBeCloseTo((2 / 10) * 100); // 20%
    expect(progress.standardMinutesProducedTotal).toBe((3 - 1) * 5 + 2 * 10);
  });

  it('computes completion based on last operation only', () => {
    // Scenario: 10 pieces in Cut/Drill/Deburr, 0 in Assemble
    const op3 = { operationId: 'op-3', sequence: 3, standardMinutes: 15 };
    const op4 = { operationId: 'op-4', sequence: 4, standardMinutes: 20 };
    const multiStepRouting = { id: 'r1', productId: 'p1', operations: [op1, op2, op3, op4] };
    
    const events = [
      makeEvent({ operationId: op1.operationId, qtyDone: 10 }),
      makeEvent({ operationId: op2.operationId, qtyDone: 10 }),
      makeEvent({ operationId: op3.operationId, qtyDone: 10 }),
      // op4 (Assemble) has 0 donePieces
    ];
    const order = { id: 'order-1', quantityRequested: 100 };
    const progress = computeOrderProgressFromEvents(order, multiStepRouting, events);
    
    // Completion should be 0% because last operation (op4) has 0 donePieces
    expect(progress.completionPercent).toBe(0);
    // Processed pieces = sum of all donePieces = 30
    expect(progress.processedPieces).toBe(30);
    // Completed pieces = donePieces from last operation (op4) = 0
    expect(progress.completedPieces).toBe(0);
    // WIP pieces = max(10, 10, 10, 0) - 0 = 10
    expect(progress.wipPieces).toBe(10);
    // Avg stage progress should be approximately 7.5% (30/100 * 100 / 4 operations)
    expect(progress.avgStageProgress).toBeCloseTo(7.5);
  });

  it('computes scrap totals correctly', () => {
    const events = [makeEvent({ qtyScrap: 2 }), makeEvent({ qtyScrap: 3 }), makeEvent({ qtyScrap: 0 })];
    expect(computeScrapTotalsFromEvents(events)).toBe(5);
  });

  it('computes standard minutes produced', () => {
    const events = [makeEvent({ operationId: op1.operationId, qtyDone: 4, qtyScrap: 1 })];
    expect(computeStandardMinutesProduced(routingSnapshot, events)).toBe((4 - 1) * 5);
  });

  it('returns null efficiency when workedMinutes is missing', () => {
    expect(computeEfficiencyPercent(100, null)).toBeNull();
  });

  it('computes efficiency percent when worked minutes present', () => {
    expect(computeEfficiencyPercent(120, 100)).toBeCloseTo(120);
  });
});
