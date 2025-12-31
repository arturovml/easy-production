import { z } from 'zod';

export const RecordProductionFormSchema = z
  .object({
    orderId: z.string().uuid('Order ID must be a valid UUID'),
    operationId: z.string().uuid('Operation ID must be a valid UUID'),
    operatorId: z.string().uuid('Operator ID must be a valid UUID'),
    workCenterId: z.union([z.string().uuid(), z.literal('')]).optional(),
    lotId: z.union([z.string().uuid(), z.literal('')]).optional(),
    qtyDonePieces: z.number().int().positive('Quantity done must be greater than 0'),
    qtyScrapPieces: z.number().int().nonnegative('Scrap quantity must be 0 or greater').optional(),
    note: z.string().max(500, 'Note must be 500 characters or less').optional(),
  })
  .refine((data) => !data.qtyScrapPieces || data.qtyScrapPieces <= data.qtyDonePieces, {
    message: 'Scrap quantity cannot exceed done quantity',
    path: ['qtyScrapPieces'],
  });

export type RecordProductionFormData = z.infer<typeof RecordProductionFormSchema>;

