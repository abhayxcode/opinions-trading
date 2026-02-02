import { z } from 'zod';
import {
  userIdSchema,
  stockSymbolSchema,
  stockTypeSchema,
  priceSchema,
  quantitySchema,
} from './common.schema';

export const buyOrderSchema = z.object({
  userId: userIdSchema,
  stockSymbol: stockSymbolSchema,
  quantity: quantitySchema,
  price: priceSchema,
  stockType: stockTypeSchema,
});

export const sellOrderSchema = z.object({
  userId: userIdSchema,
  stockSymbol: stockSymbolSchema,
  quantity: quantitySchema,
  price: priceSchema,
  stockType: stockTypeSchema,
});

export const cancelOrderSchema = z.object({
  userId: userIdSchema,
  stockSymbol: stockSymbolSchema,
  quantity: quantitySchema,
  price: priceSchema,
  stockType: stockTypeSchema,
});

export type BuyOrderInput = z.infer<typeof buyOrderSchema>;
export type SellOrderInput = z.infer<typeof sellOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
