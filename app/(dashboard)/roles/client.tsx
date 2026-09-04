'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  KeyRound,
  Shield,
  ShieldCheck,
  Users,
  Plus,
  Trash2,
  AlertTriangle,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { format } from 'date-fns';
import { createRole, deleteRole } from '@/app/actions/roles';

interface RolesClientProps {
  roles: Array<{
    id: number;
    name: string;
    description: string | null;
    isSystem: boolean;
    userCount: number;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
  }>;
  currentUserRole: string;
}

export function RolesClient({ roles, currentUserRole }: RolesClientProps) {
  const router = useRouter();

  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await createRole({
        name: newRoleName.trim(),
        description: newRoleDescription.trim() || undefined,
        permissions: [],
      });

      setSuccess(`Role "${newRoleName}" created successfully.`);
      setCreateRoleOpen(false);
      setNewRoleName('');
      setNewRoleDescription('');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create role.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteTarget) return;
    setError(null);
    setLoading(true);

    try {
      await deleteRole(deleteTarget.id);
      setSuccess(`Role "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete role.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Roles & Permissions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage operational role templates, system protections, and security privileges.
          </p>
        </div>

        {currentUserRole === 'Administrator' && (
          <Button onClick={() => setCreateRoleOpen(true)} className="gap-2">
            <Plus className="size-4" /> Create Custom Role
          </Button>
        )}
      </div>

      {success && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-emerald-700 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Roles Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-gray-500 bg-gray-50/50">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Role Name</th>
                  <th className="px-5 py-3.5 font-medium">Description</th>
                  <th className="px-5 py-3.5 font-medium">Assigned Users</th>
                  <th className="px-5 py-3.5 font-medium">Permissions</th>
                  <th className="px-5 py-3.5 font-medium">Type</th>
                  <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <KeyRound className="size-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">{role.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600 max-w-xs truncate">
                      {role.description || '—'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-gray-700">
                        <Users className="size-3.5 text-gray-400" />
                        <span className="font-medium">{role.userCount}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                        {role.permissions.length} granted
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {role.isSystem ? (
                        <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200 gap-1">
                          <Lock className="size-3" /> System Role
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                          Custom
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/roles/${role.id}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 gap-1">
                            Matrix & Users <ArrowRight className="size-3" />
                          </Button>
                        </Link>

                        {!role.isSystem && currentUserRole === 'Administrator' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete Role"
                            disabled={role.userCount > 0}
                            onClick={() => {
                              setError(null);
                              setDeleteTarget({ id: role.id, name: role.name });
                            }}
                            className="h-7 text-xs px-2 text-red-600 hover:text-red-800 hover:bg-red-50 disabled:opacity-30"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Security Policies Info Card */}
      <Card className="border-blue-100 bg-blue-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-900">
            <ShieldCheck className="size-4 text-blue-600" />
            System Roles & Immutability Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-blue-800 space-y-1.5">
          <p>
            • <strong>Core System Roles:</strong> Administrator, Manager, Warehouse Staff, Assembly Staff, and QC Staff are protected by system policies and cannot be deleted.
          </p>
          <p>
            • <strong>User Reference Safety:</strong> Roles cannot be removed while active users remain assigned to them.
          </p>
          <p>
            • <strong>Lockout Prevention (BR-ADMIN-003):</strong> The final Administrator role assignment cannot be altered or removed if it would result in zero active administrators.
          </p>
        </CardContent>
      </Card>

      {/* Create Custom Role Modal */}
      <Dialog open={createRoleOpen} onOpenChange={setCreateRoleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Create Custom Role</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Define a new custom role template. Permissions can be assigned from the matrix.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateRole} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Role Name *</label>
              <Input
                placeholder="e.g. Inventory Auditor"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Description</label>
              <Input
                placeholder="Brief description of the role responsibilities"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                className="text-sm"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => setCreateRoleOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? 'Creating...' : 'Create Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Role Modal */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="size-5 text-red-600" />
              Confirm Role Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Permanently delete the custom role &quot;{deleteTarget?.name}&quot;.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {error}
            </div>
          )}

          <p className="text-sm text-gray-700 py-2">
            Are you sure you want to delete this role? This action is audited and cannot be undone.
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={loading}
              onClick={handleDeleteRole}
            >
              {loading ? 'Deleting...' : 'Delete Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
