import { z } from 'zod';

export const CreateOrderFormSchema = z.object({
  productId: z.string().uuid('Product is required'),
  quantityRequested: z.number().int().positive('Target pieces must be greater than 0'),
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
});

export type CreateOrderFormData = z.infer<typeof CreateOrderFormSchema>;

