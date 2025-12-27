import { z } from 'zod';

// Shared types and Zod schemas
export const ProductSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  metadata: z.record(z.unknown()).optional()
});
export type Product = z.infer<typeof ProductSchema>;

export const OperationSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  durationMinutes: z.number().int().nonnegative()
});
export type Operation = z.infer<typeof OperationSchema>;

export const WorkCenterSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  location: z.string().optional()
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
  sequence: z.number().int().nonnegative()
});
export type RoutingOperation = z.infer<typeof RoutingOperationSchema>;

export const RoutingVersionSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  version: z.number().int().nonnegative(),
  createdAt: z.string().datetime()
});
export type RoutingVersion = z.infer<typeof RoutingVersionSchema>;

export const ProductionOrderSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  quantityRequested: z.number().int().positive(),
  workshopId: z.string().uuid(),
  routingVersionSnapshot: z.unknown() // keep simple for now
});
export type ProductionOrder = z.infer<typeof ProductionOrderSchema>;

export const LotSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().nonnegative(),
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
  status: z.union([z.literal('pending'), z.literal('sending'), z.literal('sent'), z.literal('failed')])
});
export type OutboxEvent = z.infer<typeof OutboxEventSchema>;
