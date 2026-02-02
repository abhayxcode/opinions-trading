import { z } from 'zod';
import {
  userIdSchema,
  stockSymbolSchema,
  quantitySchema,
  amountSchema,
} from './common.schema';

export const onrampSchema = z.object({
  userId: userIdSchema,
  amount: amountSchema,
});

export const mintSchema = z.object({
  userId: userIdSchema,
  stockSymbol: stockSymbolSchema,
  quantity: quantitySchema,
  price: z.number().positive('Price must be positive').optional(),
});

export type OnrampInput = z.infer<typeof onrampSchema>;
export type MintInput = z.infer<typeof mintSchema>;
