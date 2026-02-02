import { z } from 'zod';

export const userIdSchema = z.string().min(1, 'User ID is required');

export const stockSymbolSchema = z.string().min(1, 'Stock symbol is required');

export const stockTypeSchema = z.enum(['yes', 'no'] as const, {
  message: 'Stock type must be "yes" or "no"',
});

export const priceSchema = z
  .number()
  .min(0.5, 'Price must be at least 0.5')
  .max(10, 'Price must be at most 10')
  .refine((val) => val % 0.5 === 0, {
    message: 'Price must be in 0.5 increments',
  });

export const quantitySchema = z
  .number()
  .int('Quantity must be an integer')
  .positive('Quantity must be positive');

export const amountSchema = z
  .number()
  .positive('Amount must be positive');
