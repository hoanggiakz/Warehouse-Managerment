'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { updateRolePermissions } from '@/app/actions/roles';
import {
  KeyRound,
  Shield,
  ShieldCheck,
  Users,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Save,
} from 'lucide-react';
import { format } from 'date-fns';

interface RolePermissionMatrixProps {
  role: {
    id: number;
    name: string;
    description: string | null;
    isSystem: boolean;
    permissions: string[];
    users: Array<{
      id: number;
      username: string;
      fullName: string;
      email: string;
      status: 'ACTIVE' | 'INACTIVE';
      lastLogin: Date | null;
    }>;
    createdAt: Date;
    updatedAt: Date;
  };
  currentUserRole: string;
  currentUserId: number;
}

interface PermissionGroup {
  domain: string;
  permissions: Array<{
    key: string;
    label: string;
  }>;
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    domain: 'System & Dashboard',
    permissions: [
      { key: PERMISSIONS.DASHBOARD_VIEW, label: 'View Operational Dashboard' },
      { key: PERMISSIONS.ADMIN_DASHBOARD_VIEW, label: 'View Administration Overview' },
    ],
  },
  {
    domain: 'Parts & Catalog',
    permissions: [
      { key: PERMISSIONS.PARTS_VIEW, label: 'View Parts Catalog' },
      { key: PERMISSIONS.PARTS_CREATE, label: 'Create New Parts' },
      { key: PERMISSIONS.PARTS_UPDATE, label: 'Edit Parts Specifications' },
      { key: PERMISSIONS.PARTS_DELETE, label: 'Delete Parts' },
    ],
  },
  {
    domain: 'Categories & Taxonomy',
    permissions: [
      { key: PERMISSIONS.CATEGORIES_VIEW, label: 'View Categories' },
      { key: PERMISSIONS.CATEGORIES_CREATE, label: 'Create Categories' },
      { key: PERMISSIONS.CATEGORIES_UPDATE, label: 'Update Categories' },
      { key: PERMISSIONS.CATEGORIES_DELETE, label: 'Delete Categories' },
    ],
  },
  {
    domain: 'Suppliers & Vendors',
    permissions: [
      { key: PERMISSIONS.SUPPLIERS_VIEW, label: 'View Suppliers' },
      { key: PERMISSIONS.SUPPLIERS_CREATE, label: 'Create Suppliers' },
      { key: PERMISSIONS.SUPPLIERS_UPDATE, label: 'Update Suppliers' },
      { key: PERMISSIONS.SUPPLIERS_DELETE, label: 'Delete Suppliers' },
    ],
  },
  {
    domain: 'Warehouses & Locations',
    permissions: [
      { key: PERMISSIONS.WAREHOUSES_VIEW, label: 'View Warehouses' },
      { key: PERMISSIONS.WAREHOUSES_CREATE, label: 'Create Warehouses' },
      { key: PERMISSIONS.WAREHOUSES_UPDATE, label: 'Update Warehouses' },
      { key: PERMISSIONS.WAREHOUSES_DELETE, label: 'Delete Warehouses' },
    ],
  },
  {
    domain: 'Inventory Operations',
    permissions: [
      { key: PERMISSIONS.INVENTORY_VIEW, label: 'View Inventory Levels' },
      { key: PERMISSIONS.INVENTORY_CREATE, label: 'Add Initial Inventory' },
      { key: PERMISSIONS.INVENTORY_UPDATE, label: 'Update Stock Thresholds' },
      { key: PERMISSIONS.INVENTORY_ADJUST, label: 'Reconcile / Adjust Stock' },
    ],
  },
  {
    domain: 'Imports (Inbound Logistics)',
    permissions: [
      { key: PERMISSIONS.IMPORTS_VIEW, label: 'View Inbound Receipts' },
      { key: PERMISSIONS.IMPORTS_CREATE, label: 'Create Inbound Receipts' },
      { key: PERMISSIONS.IMPORTS_APPROVE, label: 'Approve Inbound Shipments' },
      { key: PERMISSIONS.IMPORTS_COMPLETE, label: 'Complete & Ingest Stock' },
      { key: PERMISSIONS.IMPORTS_CANCEL, label: 'Cancel Import Receipts' },
    ],
  },
  {
    domain: 'Exports (Outbound Logistics)',
    permissions: [
      { key: PERMISSIONS.EXPORTS_VIEW, label: 'View Outbound Receipts' },
      { key: PERMISSIONS.EXPORTS_CREATE, label: 'Request Outbound Shipments' },
      { key: PERMISSIONS.EXPORTS_APPROVE, label: 'Approve Outbound Orders' },
      { key: PERMISSIONS.EXPORTS_COMPLETE, label: 'Fulfill & Dispatch Stock' },
      { key: PERMISSIONS.EXPORTS_CANCEL, label: 'Cancel Outbound Orders' },
    ],
  },
  {
    domain: 'Stock Checks & Physical Audit',
    permissions: [
      { key: PERMISSIONS.STOCK_CHECK_VIEW, label: 'View Stock Checks' },
      { key: PERMISSIONS.STOCK_CHECK_CREATE, label: 'Initiate Stock Counts' },
      { key: PERMISSIONS.STOCK_CHECK_COUNT, label: 'Record Count Quantities' },
      { key: PERMISSIONS.STOCK_CHECK_COMPLETE, label: 'Submit Physical Count' },
      { key: PERMISSIONS.STOCK_CHECK_APPROVE, label: 'Approve Discrepancies' },
      { key: PERMISSIONS.STOCK_CHECK_ADJUST, label: 'Reconcile Variance to Inventory' },
      { key: PERMISSIONS.STOCK_CHECK_CANCEL, label: 'Cancel Stock Check' },
    ],
  },
  {
    domain: 'Quality Control (QC Inspections)',
    permissions: [
      { key: PERMISSIONS.QUALITY_CHECK_VIEW, label: 'View Quality Checks' },
      { key: PERMISSIONS.QUALITY_CHECK_CREATE, label: 'Schedule Inspections' },
      { key: PERMISSIONS.QUALITY_CHECK_START, label: 'Start Inspection Process' },
      { key: PERMISSIONS.QUALITY_CHECK_RECORD_DEFECT, label: 'Log Defect Classifications' },
      { key: PERMISSIONS.QUALITY_CHECK_COMPLETE, label: 'Finalize Inspection Verdict' },
      { key: PERMISSIONS.QUALITY_CHECK_REVIEW, label: 'Review QC Incidents' },
      { key: PERMISSIONS.QUALITY_CHECK_RESOLVE, label: 'Resolve Defective Stock' },
      { key: PERMISSIONS.QUALITY_CHECK_ADJUST, label: 'Apply Disposition Adjustments' },
      { key: PERMISSIONS.QUALITY_CHECK_CANCEL, label: 'Cancel Inspections' },
    ],
  },
  {
    domain: 'Reports & Analytics',
    permissions: [
      { key: PERMISSIONS.REPORTS_VIEW, label: 'View Analytics Dashboard' },
      { key: PERMISSIONS.REPORTS_EXPORT, label: 'Export Analytics Data (CSV)' },
      { key: PERMISSIONS.REPORT_INVENTORY, label: 'Inventory Breakdown Report' },
      { key: PERMISSIONS.REPORT_IMPORT, label: 'Inbound Spending Report' },
      { key: PERMISSIONS.REPORT_EXPORT, label: 'Outbound Fulfillment Report' },
      { key: PERMISSIONS.REPORT_STOCK_CHECK, label: 'Stock Variance Report' },
      { key: PERMISSIONS.REPORT_QUALITY, label: 'Defect & Severity Report' },
      { key: PERMISSIONS.REPORT_SUPPLIER, label: 'Supplier Scorecard Report' },
      { key: PERMISSIONS.REPORT_PART, label: 'Part Performance Report' },
      { key: PERMISSIONS.REPORT_WAREHOUSE, label: 'Warehouse Capacity Report' },
    ],
  },
  {
    domain: 'User Administration',
    permissions: [
      { key: PERMISSIONS.USERS_VIEW, label: 'View System Users' },
      { key: PERMISSIONS.USERS_CREATE, label: 'Create New User Accounts' },
      { key: PERMISSIONS.USERS_UPDATE, label: 'Edit User Accounts & Roles' },
      { key: PERMISSIONS.USERS_ACTIVATE, label: 'Activate User Accounts' },
      { key: PERMISSIONS.USERS_DEACTIVATE, label: 'Deactivate User Accounts' },
      { key: PERMISSIONS.USERS_RESET_PASSWORD, label: 'Reset User Passwords' },
    ],
  },
  {
    domain: 'Role & System Administration',
    permissions: [
      { key: PERMISSIONS.ROLES_VIEW, label: 'View Roles & Matrix' },
      { key: PERMISSIONS.ROLES_CREATE, label: 'Create Custom Roles' },
      { key: PERMISSIONS.ROLES_UPDATE, label: 'Edit Roles' },
      { key: PERMISSIONS.ROLES_DELETE, label: 'Delete Roles' },
      { key: PERMISSIONS.ROLES_PERMISSIONS_UPDATE, label: 'Update Role Permissions Matrix' },
    ],
  },
  {
    domain: 'Audit & Compliance',
    permissions: [
      { key: PERMISSIONS.AUDIT_LOGS_VIEW, label: 'View Audit Logs & System History' },
    ],
  },
];

export function RolePermissionMatrix({
  role,
  currentUserRole,
}: RolePermissionMatrixProps) {
  const router = useRouter();

  const [activePermissions, setActivePermissions] = useState<Set<string>>(
    new Set(role.permissions)
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Can the current user edit this matrix?
  // Only Administrators can update permissions, and only Admins can touch Administrator role (BR-ADMIN-006)
  const canEdit = currentUserRole === 'Administrator';

  const togglePermission = (key: string) => {
    if (!canEdit) return;
    const next = new Set(activePermissions);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setActivePermissions(next);
  };

  const toggleGroup = (group: PermissionGroup, enable: boolean) => {
    if (!canEdit) return;
    const next = new Set(activePermissions);
    group.permissions.forEach((p) => {
      if (enable) {
        next.add(p.key);
      } else {
        next.delete(p.key);
      }
    });
    setActivePermissions(next);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setError(null);
    setLoading(true);

    try {
      await updateRolePermissions({
        roleId: role.id,
        permissions: Array.from(activePermissions),
      });

      setSuccess('Permissions matrix updated and audited successfully.');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update permissions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Role Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{role.name}</h1>
            {role.isSystem ? (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                <Lock className="size-3" /> System Role
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200">
                Custom Role
              </Badge>
            )}
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              {activePermissions.size} Permissions Active
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {role.description || 'No description provided.'} • Assigned to {role.users.length} active account(s)
          </p>
        </div>

        {canEdit && (
          <Button onClick={handleSave} disabled={loading} className="gap-2">
            <Save className="size-4" />
            {loading ? 'Saving Changes...' : 'Save Permissions Matrix'}
          </Button>
        )}
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

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="size-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Assigned Users Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="size-4 text-gray-500" />
            Assigned Users ({role.users.length})
          </CardTitle>
          <CardDescription>Accounts currently bound to this permissions template</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {role.users.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No users are currently assigned to this role.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-gray-500 bg-gray-50/50">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Full Name / Username</th>
                    <th className="px-5 py-2.5 font-medium">Email</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 font-medium">Last Login</th>
                    <th className="px-5 py-2.5 font-medium text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {role.users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-2.5 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{u.fullName}</span>
                        <span className="text-xs text-gray-500 ml-1.5">(@{u.username})</span>
                      </td>
                      <td className="px-5 py-2.5 text-xs text-gray-600 whitespace-nowrap">{u.email}</td>
                      <td className="px-5 py-2.5 whitespace-nowrap">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {u.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                        {u.lastLogin ? format(new Date(u.lastLogin), 'yyyy-MM-dd HH:mm') : 'Never'}
                      </td>
                      <td className="px-5 py-2.5 text-right whitespace-nowrap">
                        <Link href={`/users/${u.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                            View <ArrowRight className="size-3 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Matrix by Domain */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Permissions Matrix</h2>
            <p className="text-xs text-gray-500">
              {canEdit
                ? 'Toggle permissions to grant or revoke access for all assigned accounts.'
                : 'Read-only view of permissions granted to this role.'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {PERMISSION_GROUPS.map((group) => {
            const allChecked = group.permissions.every((p) => activePermissions.has(p.key));
            const someChecked = group.permissions.some((p) => activePermissions.has(p.key));

            return (
              <Card key={group.domain} className="flex flex-col justify-between">
                <CardHeader className="pb-3 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-900">
                      {group.domain}
                    </CardTitle>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group, !allChecked)}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        {allChecked ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-2 flex-1">
                  {group.permissions.map((perm) => {
                    const isChecked = activePermissions.has(perm.key);

                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-2.5 p-2 rounded-md transition-colors ${
                          canEdit ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={!canEdit}
                          onChange={() => togglePermission(perm.key)}
                          className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary/20 size-4"
                        />
                        <div className="text-xs">
                          <span className={`font-medium ${isChecked ? 'text-gray-900' : 'text-gray-500'}`}>
                            {perm.label}
                          </span>
                          <span className="block text-[11px] font-mono text-gray-400 mt-0.5">
                            {perm.key}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
