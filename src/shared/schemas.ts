import { z } from 'zod';

// Shared types and Zod schemas
export const ProductSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  metadata: z.record(z.unknown()).optional(),
  activeRoutingVersionId: z.string().uuid().optional()
});
export type Product = z.infer<typeof ProductSchema>;

export const OperationSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  durationMinutes: z.number().int().nonnegative(),
  qualityGate: z.boolean().default(false)
});
export type Operation = z.infer<typeof OperationSchema>;

export const WorkCenterSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  location: z.string().optional(),
  type: z.string().optional()
});
export type WorkCenter = z.infer<typeof WorkCenterSchema>;

export const OperatorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  badgeNumber: z.string().optional()
});
export type Operator = z.infer<typeof OperatorSchema>;

export const RoutingOperationSchema = z.object({
  id: z.string().uuid(),
  routingVersionId: z.string().uuid(),
  operationId: z.string().uuid(),
  sequence: z.number().int().nonnegative(),
  standardMinutesOverride: z.number().int().positive().optional(),
  workCenterIdOverride: z.string().uuid().optional()
});
export type RoutingOperation = z.infer<typeof RoutingOperationSchema>;

export const RoutingVersionSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  version: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  isDraft: z.boolean().default(true)
});
export type RoutingVersion = z.infer<typeof RoutingVersionSchema>;

export const ProductionOrderSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  quantityRequested: z.number().int().positive(),
  workshopId: z.string().uuid(),
  routingVersionSnapshot: z.unknown(), // keep simple for now
  trackingMode: z.enum(['piece', 'lot', 'hybrid']).default('piece')
});
export type ProductionOrder = z.infer<typeof ProductionOrderSchema>;

export const LotSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid().optional(), // Required for new lots, optional for legacy compatibility
  productId: z.string().uuid().optional(), // Legacy field, kept for compatibility
  lotNumber: z.number().int().positive(),
  plannedPieces: z.number().int().positive(),
  createdAt: z.string().datetime()
});
export type Lot = z.infer<typeof LotSchema>;

// Event model
export const WorkEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  aggregateId: z.string(),
  workshopId: z.string().uuid(),
  timestamp: z.string().datetime(),
  payload: z.record(z.unknown()).optional(),
  schemaVersion: z.number().int().nonnegative()
});
export type WorkEvent = z.infer<typeof WorkEventSchema>;

export const OutboxEventSchema = WorkEventSchema.extend({
  status: z.union([z.literal('pending'), z.literal('sending'), z.literal('sent'), z.literal('failed')]),
  attemptCount: z.number().int().nonnegative().default(0),
  lastAttemptAt: z.string().datetime().optional(),
  sentAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
});
export type OutboxEvent = z.infer<typeof OutboxEventSchema>;
