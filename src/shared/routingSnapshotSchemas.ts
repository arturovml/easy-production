import { z } from 'zod';

// Minimal schema for routing snapshot validation (for aggregation safety)
export const RoutingOperationSnapshotSchema = z.object({
  operationId: z.string().uuid(),
  sequence: z.number().int().nonnegative(),
  standardMinutes: z.number().nonnegative(),
  operationName: z.string().optional(),
  qualityGate: z.boolean().optional(),
  workCenterId: z.string().uuid().optional(),
});

export const RoutingSnapshotSchema = z.object({
  id: z.string(),
  productId: z.string().uuid().optional(),
  operations: z.array(RoutingOperationSnapshotSchema),
});

export type RoutingOperationSnapshot = z.infer<typeof RoutingOperationSnapshotSchema>;
export type RoutingSnapshot = z.infer<typeof RoutingSnapshotSchema>;

