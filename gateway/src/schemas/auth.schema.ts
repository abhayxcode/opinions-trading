import { z } from 'zod';

export const registerSchema = z.object({
  userId: z
    .string()
    .min(3, 'User ID must be at least 3 characters')
    .max(50, 'User ID must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'User ID can only contain alphanumeric characters, underscores, and hyphens'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
});

export const loginSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
