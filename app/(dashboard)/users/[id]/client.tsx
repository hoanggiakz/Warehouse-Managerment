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
  ArrowLeft,
  UserCheck,
  UserX,
  Key,
  Shield,
  Clock,
  Edit2,
  AlertTriangle,
  History,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  updateUser,
  activateUser,
  deactivateUser,
  changeUserRole,
  resetUserPassword,
} from '@/app/actions/users';

interface UserDetailClientProps {
  user: {
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
    recentActivity: Array<{
      id: number;
      action: string;
      entity: string;
      entityId: string | null;
      timestamp: Date;
      metadata: any;
      ipAddress: string | null;
    }>;
  };
  roles: Array<{
    id: number;
    name: string;
  }>;
  currentUserRole: string;
  currentUserId: number;
}

export function UserDetailClient({
  user,
  roles,
  currentUserRole,
  currentUserId,
}: UserDetailClientProps) {
  const router = useRouter();

  // Modals & form state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: user.fullName,
    email: user.email,
    department: user.department || '',
  });

  // Role select state
  const [selectedRoleId, setSelectedRoleId] = useState(user.roleId.toString());

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status/feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle Edit Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await updateUser({
        id: user.id,
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        department: editForm.department.trim() || undefined,
        roleId: user.roleId,
        status: user.status,
      });

      setSuccess('User profile updated successfully.');
      setEditProfileOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update user profile.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Change Role
  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await changeUserRole(user.id, parseInt(selectedRoleId, 10));
      setSuccess('Role assignment updated successfully.');
      setChangeRoleOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to change role.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Status Change
  const handleToggleStatus = async () => {
    setError(null);
    setLoading(true);

    try {
      if (user.status === 'ACTIVE') {
        await deactivateUser(user.id);
        setSuccess(`User @${user.username} has been deactivated.`);
      } else {
        await activateUser(user.id);
        setSuccess(`User @${user.username} has been activated.`);
      }
      setStatusDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update account status.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await resetUserPassword({
        userId: user.id,
        newPassword,
        confirmPassword,
      });

      setSuccess('Password has been successfully reset.');
      setResetPasswordOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-3">
        <Link href="/users">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ArrowLeft className="size-4" /> Back to Users
          </Button>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{user.fullName}</h1>
            {user.status === 'ACTIVE' ? (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                <UserCheck className="size-3" /> Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 gap-1">
                <UserX className="size-3" /> Inactive
              </Badge>
            )}
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
              {user.role.name}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            @{user.username} • Account ID #{user.id}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null);
              setEditForm({
                fullName: user.fullName,
                email: user.email,
                department: user.department || '',
              });
              setEditProfileOpen(true);
            }}
            className="gap-1.5 text-xs"
          >
            <Edit2 className="size-3.5" /> Edit Profile
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null);
              setSelectedRoleId(user.roleId.toString());
              setChangeRoleOpen(true);
            }}
            className="gap-1.5 text-xs"
          >
            <Shield className="size-3.5" /> Change Role
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null);
              setNewPassword('');
              setConfirmPassword('');
              setResetPasswordOpen(true);
            }}
            className="gap-1.5 text-xs"
          >
            <Key className="size-3.5" /> Reset Password
          </Button>

          {user.status === 'ACTIVE' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                setStatusDialogOpen(true);
              }}
              className="gap-1.5 text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-50"
            >
              <UserX className="size-3.5" /> Deactivate
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                setStatusDialogOpen(true);
              }}
              className="gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
            >
              <UserCheck className="size-3.5" /> Activate
            </Button>
          )}
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-700 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Two Column Layout: Details & Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Identity & Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Account Identity & Settings</CardTitle>
            <CardDescription>Primary profile data, role assignments, and timestamps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-gray-500">Full Name</span>
                <p className="font-medium text-gray-900 mt-0.5">{user.fullName}</p>
              </div>

              <div>
                <span className="text-xs text-gray-500">Username</span>
                <p className="font-medium text-gray-900 mt-0.5">@{user.username}</p>
              </div>

              <div>
                <span className="text-xs text-gray-500">Email Address</span>
                <p className="font-medium text-gray-900 mt-0.5">{user.email}</p>
              </div>

              <div>
                <span className="text-xs text-gray-500">Department</span>
                <p className="font-medium text-gray-900 mt-0.5">{user.department || 'Not specified'}</p>
              </div>

              <div>
                <span className="text-xs text-gray-500">Assigned Role</span>
                <p className="font-medium text-gray-900 mt-0.5">{user.role.name}</p>
              </div>

              <div>
                <span className="text-xs text-gray-500">Account Status</span>
                <p className="font-medium mt-0.5">
                  {user.status === 'ACTIVE' ? (
                    <span className="text-emerald-700 font-semibold">ACTIVE</span>
                  ) : (
                    <span className="text-gray-500 font-semibold">INACTIVE</span>
                  )}
                </p>
              </div>

              <div>
                <span className="text-xs text-gray-500">Last Authentication</span>
                <p className="font-medium text-gray-900 mt-0.5">
                  {user.lastLogin ? format(new Date(user.lastLogin), 'yyyy-MM-dd HH:mm:ss') : 'Never'}
                </p>
              </div>

              <div>
                <span className="text-xs text-gray-500">Created Timestamp</span>
                <p className="font-medium text-gray-900 mt-0.5">
                  {format(new Date(user.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Audit Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Recent User Activity</CardTitle>
                <CardDescription>Audit log trail associated with this account</CardDescription>
              </div>
              <History className="size-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            {user.recentActivity.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No recent audit activity found for this user.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {user.recentActivity.map((activity) => (
                  <div key={activity.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {activity.action}
                        </Badge>
                        <span className="text-gray-600 font-medium">{activity.entity}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        IP: {activity.ipAddress || 'unknown'}
                      </div>
                    </div>
                    <div className="text-gray-400 whitespace-nowrap">
                      {format(new Date(activity.timestamp), 'MM-dd HH:mm:ss')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Edit User Profile</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Update user identity and department metadata.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Full Name</label>
              <Input
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                required
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Email Address</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Department</label>
              <Input
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                className="text-sm"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => setEditProfileOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Role Modal */}
      <Dialog open={changeRoleOpen} onOpenChange={setChangeRoleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Change Role Assignment</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Reassign permissions template for user @{user.username}.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleChangeRole} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Select Role</label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {roles.map((r) => {
                  const isDisabled = r.name === 'Administrator' && currentUserRole !== 'Administrator';
                  return (
                    <option key={r.id} value={r.id} disabled={isDisabled}>
                      {r.name} {isDisabled ? '(Admin only)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <p className="text-xs text-gray-500">
              Note: The final active Administrator role cannot be removed if it would leave zero active administrators (BR-ADMIN-003).
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => setChangeRoleOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? 'Updating...' : 'Update Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Reset Password</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Provision a new password for @{user.username}.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4 py-2">
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
              <label className="text-xs font-medium text-gray-700">Confirm Password</label>
              <Input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => setResetPasswordOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Toggle Modal */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className={`size-5 ${user.status === 'ACTIVE' ? 'text-amber-600' : 'text-emerald-600'}`} />
              {user.status === 'ACTIVE' ? 'Confirm Deactivation' : 'Confirm Activation'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Review security impact on account status.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2 py-2 text-sm text-gray-700">
            {user.status === 'ACTIVE' ? (
              <>
                <p>Are you sure you want to deactivate @{user.username}?</p>
                <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                  <p className="font-semibold">Security Rule BR-ADMIN-001:</p>
                  <p>
                    The final active Administrator account cannot be deactivated. Inactive users are immediately barred from logging in and executing server operations.
                  </p>
                </div>
              </>
            ) : (
              <p>Reactivate account for @{user.username}? The user will be authorized to authenticate.</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => setStatusDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant={user.status === 'ACTIVE' ? 'destructive' : 'default'}
              size="sm"
              disabled={loading}
              onClick={handleToggleStatus}
            >
              {loading ? 'Processing...' : user.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
