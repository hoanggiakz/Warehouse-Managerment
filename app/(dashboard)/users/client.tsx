'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  UserCheck,
  UserX,
  Key,
  Shield,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { activateUser, deactivateUser, resetUserPassword } from '@/app/actions/users';

interface UsersClientProps {
  initialData: {
    users: Array<{
      id: number;
      username: string;
      email: string;
      fullName: string;
      roleId: number;
      department: string | null;
      status: 'ACTIVE' | 'INACTIVE';
      lastLogin: Date | null;
      createdAt: Date;
      updatedAt: Date;
      role: {
        id: number;
        name: string;
        description: string | null;
      };
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  roles: Array<{
    id: number;
    name: string;
  }>;
  currentUserRole: string;
  currentUserId: number;
  searchParams: {
    page: number;
    search: string;
    roleId?: number;
    status: string;
  };
}

export function UsersClient({
  initialData,
  roles,
  currentUserRole,
  currentUserId,
  searchParams,
}: UsersClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(searchParams.search);
  const [selectedRole, setSelectedRole] = useState(searchParams.roleId?.toString() || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.status);

  // Modal states
  const [statusDialogTarget, setStatusDialogTarget] = useState<{
    id: number;
    username: string;
    currentStatus: 'ACTIVE' | 'INACTIVE';
    roleName: string;
  } | null>(null);

  const [resetPasswordTarget, setResetPasswordTarget] = useState<{
    id: number;
    username: string;
  } | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Apply filters
  const applyFilters = (newParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      page: 1,
      search,
      roleId: selectedRole,
      status: selectedStatus,
      ...newParams,
    };

    if (merged.search) params.set('search', String(merged.search));
    if (merged.roleId) params.set('roleId', String(merged.roleId));
    if (merged.status && merged.status !== 'ALL') params.set('status', String(merged.status));
    if (merged.page && Number(merged.page) > 1) params.set('page', String(merged.page));

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ search, page: 1 });
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedRole('');
    setSelectedStatus('ALL');
    router.push(pathname);
  };

  // Toggle user status handler
  const handleConfirmStatusChange = async () => {
    if (!statusDialogTarget) return;
    setLoading(true);
    setDialogError(null);

    try {
      if (statusDialogTarget.currentStatus === 'ACTIVE') {
        await deactivateUser(statusDialogTarget.id);
        setActionSuccess(`User @${statusDialogTarget.username} has been deactivated.`);
      } else {
        await activateUser(statusDialogTarget.id);
        setActionSuccess(`User @${statusDialogTarget.username} has been activated.`);
      }
      setStatusDialogTarget(null);
      router.refresh();
    } catch (err: any) {
      setDialogError(err.message || 'Failed to update user status.');
    } finally {
      setLoading(false);
    }
  };

  // Reset password handler
  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordTarget) return;

    if (newPassword.length < 8) {
      setDialogError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setDialogError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setDialogError(null);

    try {
      await resetUserPassword({
        userId: resetPasswordTarget.id,
        newPassword,
        confirmPassword,
      });
      setActionSuccess(`Password reset successfully for @${resetPasswordTarget.username}.`);
      setResetPasswordTarget(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setDialogError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage system users, credentials, role assignments, and lifecycle statuses.
          </p>
        </div>
        <Link href="/users/new">
          <Button className="gap-2">
            <Plus className="size-4" /> Create User
          </Button>
        </Link>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 size-4 text-gray-400" />
              <Input
                placeholder="Search by name, username, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  applyFilters({ roleId: e.target.value || undefined, page: 1 });
                }}
                className="h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  applyFilters({ status: e.target.value, page: 1 });
                }}
                className="h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              <Button type="submit" variant="secondary" size="sm" className="h-9">
                Search
              </Button>

              {(search || selectedRole || selectedStatus !== 'ALL') && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-9 text-xs text-gray-500"
                >
                  Reset
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-gray-500 bg-gray-50/50">
                <tr>
                  <th className="px-5 py-3.5 font-medium">User / Username</th>
                  <th className="px-5 py-3.5 font-medium">Email / Department</th>
                  <th className="px-5 py-3.5 font-medium">Role</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium">Last Login</th>
                  <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialData.users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">
                      No users found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  initialData.users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{user.fullName}</div>
                        <div className="text-xs text-gray-500">@{user.username}</div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-gray-900 text-xs">{user.email}</div>
                        <div className="text-[11px] text-gray-500">{user.department || '—'}</div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            user.role.name === 'Administrator'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : user.role.name === 'Manager'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {user.role.name}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {user.status === 'ACTIVE' ? (
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-xs">
                            <UserCheck className="size-3" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 gap-1 text-xs">
                            <UserX className="size-3" /> Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                        {user.lastLogin ? (
                          format(new Date(user.lastLogin), 'yyyy-MM-dd HH:mm')
                        ) : (
                          <span className="text-gray-400 italic">Never logged in</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/users/${user.id}`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                              Details
                            </Button>
                          </Link>

                          {/* Reset Password Trigger */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Reset Password"
                            onClick={() => {
                              setDialogError(null);
                              setNewPassword('');
                              setConfirmPassword('');
                              setResetPasswordTarget({ id: user.id, username: user.username });
                            }}
                            className="h-7 text-xs px-2 text-gray-600 hover:text-gray-900"
                          >
                            <Key className="size-3.5" />
                          </Button>

                          {/* Status Toggle Trigger */}
                          {user.status === 'ACTIVE' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Deactivate Account"
                              onClick={() => {
                                setDialogError(null);
                                setStatusDialogTarget({
                                  id: user.id,
                                  username: user.username,
                                  currentStatus: 'ACTIVE',
                                  roleName: user.role.name,
                                });
                              }}
                              className="h-7 text-xs px-2 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                            >
                              <UserX className="size-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Activate Account"
                              onClick={() => {
                                setDialogError(null);
                                setStatusDialogTarget({
                                  id: user.id,
                                  username: user.username,
                                  currentStatus: 'INACTIVE',
                                  roleName: user.role.name,
                                });
                              }}
                              className="h-7 text-xs px-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                            >
                              <UserCheck className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {initialData.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-100 text-sm">
              <span className="text-xs text-gray-500">
                Showing page {initialData.page} of {initialData.totalPages} ({initialData.total} total users)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={initialData.page <= 1}
                  onClick={() => applyFilters({ page: initialData.page - 1 })}
                  className="h-8 text-xs gap-1"
                >
                  <ChevronLeft className="size-3" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={initialData.page >= initialData.totalPages}
                  onClick={() => applyFilters({ page: initialData.page + 1 })}
                  className="h-8 text-xs gap-1"
                >
                  Next <ChevronRight className="size-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deactivate / Activate Confirmation Dialog */}
      <Dialog
        open={statusDialogTarget !== null}
        onOpenChange={(open) => !open && setStatusDialogTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className={`size-5 ${statusDialogTarget?.currentStatus === 'ACTIVE' ? 'text-amber-600' : 'text-emerald-600'}`} />
              {statusDialogTarget?.currentStatus === 'ACTIVE'
                ? 'Confirm Account Deactivation'
                : 'Confirm Account Activation'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Please review the security and operational impact of this action.
            </DialogDescription>
          </DialogHeader>

          {dialogError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {dialogError}
            </div>
          )}

          <div className="space-y-3 py-2 text-sm text-gray-700">
            {statusDialogTarget?.currentStatus === 'ACTIVE' ? (
              <>
                <p>
                  Are you sure you want to deactivate the account for{' '}
                  <strong className="text-gray-900">@{statusDialogTarget?.username}</strong>?
                </p>
                <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                  <p className="font-semibold">Security Consequences:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>The user will immediately be barred from authenticating.</li>
                    <li>Active sessions will be rejected from executing privileged operations.</li>
                    <li>The final active Administrator cannot be deactivated (BR-ADMIN-001).</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <p>
                  Reactivate the account for{' '}
                  <strong className="text-gray-900">@{statusDialogTarget?.username}</strong>?
                </p>
                <p className="text-xs text-gray-500">
                  This user will immediately be granted authorization to log in and exercise permissions associated with their assigned role.
                </p>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => setStatusDialogTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant={statusDialogTarget?.currentStatus === 'ACTIVE' ? 'destructive' : 'default'}
              size="sm"
              disabled={loading}
              onClick={handleConfirmStatusChange}
            >
              {loading ? 'Processing...' : statusDialogTarget?.currentStatus === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal Dialog */}
      <Dialog
        open={resetPasswordTarget !== null}
        onOpenChange={(open) => !open && setResetPasswordTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Key className="size-4 text-blue-600" />
              Reset User Password
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Set a new secure password for user @{resetPasswordTarget?.username}.
            </DialogDescription>
          </DialogHeader>

          {dialogError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {dialogError}
            </div>
          )}

          <form onSubmit={handleConfirmResetPassword} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">New Password</label>
              <Input
                type="password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Confirm New Password</label>
              <Input
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            <p className="text-[11px] text-gray-500">
              The password will be securely hashed using bcrypt. Plaintext passwords are never stored, logged, or exposed in audit trails.
            </p>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => setResetPasswordTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? 'Resetting...' : 'Confirm Password Reset'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
