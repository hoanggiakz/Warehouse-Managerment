import { z } from 'zod';

export const UserStatusEnum = z.enum(['ACTIVE', 'INACTIVE']);

export const CreateUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain alphanumeric characters, underscores, and hyphens'),
  email: z.string().email('Invalid email address').max(100),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  roleId: z.coerce.number().int().positive('Valid role is required'),
  department: z.string().max(100).optional().nullable(),
  status: UserStatusEnum.default('ACTIVE'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters'),
  confirmPassword: z.string().min(8, 'Password confirmation must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  id: z.coerce.number().int().positive(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').max(100),
  department: z.string().max(100).optional().nullable(),
  roleId: z.coerce.number().int().positive('Valid role is required'),
  status: UserStatusEnum,
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters'),
  confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match',
  path: ['confirmPassword'],
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const ResetPasswordSchema = z.object({
  userId: z.coerce.number().int().positive(),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters'),
  confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const UserFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional().default(''),
  roleId: z.coerce.number().int().positive().optional(),
  status: z.enum(['ALL', 'ACTIVE', 'INACTIVE']).default('ALL'),
});

export type UserFilterInput = z.infer<typeof UserFilterSchema>;
