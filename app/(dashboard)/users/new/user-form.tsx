'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createUser } from '@/app/actions/users';
import { UserCheck, Shield, AlertCircle } from 'lucide-react';

interface UserFormProps {
  roles: Array<{
    id: number;
    name: string;
  }>;
  currentUserRole: string;
}

export function UserForm({ roles, currentUserRole }: UserFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    department: '',
    roleId: roles.length > 0 ? roles[0].id.toString() : '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      await createUser({
        username: formData.username.trim(),
        email: formData.email.trim(),
        fullName: formData.fullName.trim(),
        department: formData.department.trim() || undefined,
        roleId: parseInt(formData.roleId, 10),
        status: formData.status,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      router.push('/users');
    } catch (err: any) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Account Information</CardTitle>
        <CardDescription>All fields marked with an asterisk (*) are required.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Full Name *</label>
              <Input
                type="text"
                placeholder="e.g. Kenji Sato"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Username *</label>
              <Input
                type="text"
                placeholder="e.g. ksato (alphanumeric, -, _)"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Email Address *</label>
              <Input
                type="email"
                placeholder="ksato@maluzen.co.jp"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Department / Division</label>
              <Input
                type="text"
                placeholder="e.g. Logistics & Receiving"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">System Role *</label>
              <select
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                required
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {roles.map((r) => {
                  // Non-administrators cannot assign Administrator role
                  const isDisabled = r.name === 'Administrator' && currentUserRole !== 'Administrator';
                  return (
                    <option key={r.id} value={r.id} disabled={isDisabled}>
                      {r.name} {isDisabled ? '(Admin only)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Initial Account Status *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                required
                className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ACTIVE">ACTIVE (Authorized to authenticate)</option>
                <option value="INACTIVE">INACTIVE (Deactivated / Locked)</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 mt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Initial Credentials
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Password *</label>
                <Input
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Confirm Password *</label>
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => router.push('/users')}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create User Account'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
