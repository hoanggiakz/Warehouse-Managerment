import { z } from 'zod';

export const SYSTEM_ROLES = [
  'Administrator',
  'Manager',
  'Warehouse Staff',
  'Assembly Staff',
  'QC Staff',
] as const;

export function isSystemRole(roleName: string): boolean {
  return (SYSTEM_ROLES as readonly string[]).includes(roleName);
}

export const CreateRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').max(50),
  description: z.string().max(255).optional().nullable(),
  permissions: z.array(z.string()).default([]),
});

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;

export const UpdateRoleSchema = z.object({
  id: z.coerce.number().int().positive(),
  description: z.string().max(255).optional().nullable(),
  permissions: z.array(z.string()).optional(),
});

export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;

export const UpdateRolePermissionsSchema = z.object({
  roleId: z.coerce.number().int().positive(),
  permissions: z.array(z.string()),
});

export type UpdateRolePermissionsInput = z.infer<typeof UpdateRolePermissionsSchema>;
