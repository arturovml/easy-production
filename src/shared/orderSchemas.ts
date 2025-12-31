import { z } from 'zod';

export const CreateOrderFormSchema = z
  .object({
    productId: z.string().uuid('Product is required'),
    quantityRequested: z.number().int().positive('Target pieces must be greater than 0'),
    trackingMode: z.enum(['piece', 'lot', 'hybrid'], { required_error: 'Tracking mode is required' }),
    lotSize: z.number().int().positive().optional(),
    notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
  })
  .refine(
    (data) => {
      if (data.trackingMode === 'piece') {
        return true; // lotSize not required for piece
      }
      return data.lotSize !== undefined && data.lotSize > 0 && data.lotSize <= data.quantityRequested;
    },
    {
      message: 'Lot size is required and must be greater than 0 and less than or equal to target pieces',
      path: ['lotSize'],
    }
  );

export type CreateOrderFormData = z.infer<typeof CreateOrderFormSchema>;

