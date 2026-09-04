'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  UserCheck,
  UserX,
  KeyRound,
  Shield,
  ShieldCheck,
  ArrowRight,
  Clock,
  History,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

interface AdminDashboardClientProps {
  metrics: {
    userMetrics: {
      total: number;
      active: number;
      inactive: number;
      recentLogins: number;
    };
    roleMetrics: {
      totalRoles: number;
      roles: Array<{
        id: number;
        name: string;
        description: string | null;
        userCount: number;
      }>;
    };
    securityActivity: {
      totalAuditLogs: number;
      recentEvents: Array<{
        id: number;
        action: string;
        entity: string;
        entityId: string | null;
        actor: string;
        actorUsername: string;
        actorRole: string;
        timestamp: Date;
        ipAddress: string | null;
      }>;
    };
  };
  userRole: string;
}

export function AdminDashboardClient({ metrics, userRole }: AdminDashboardClientProps) {
  const { userMetrics, roleMetrics, securityActivity } = metrics;

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            <Users className="size-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userMetrics.total}</div>
            <p className="text-xs text-gray-500 mt-1">All registered accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">Active Accounts</CardTitle>
            <UserCheck className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{userMetrics.active}</div>
            <p className="text-xs text-gray-500 mt-1">Authorized to log in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">Inactive Accounts</CardTitle>
            <UserX className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{userMetrics.inactive}</div>
            <p className="text-xs text-gray-500 mt-1">Deactivated / locked out</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">Configured Roles</CardTitle>
            <KeyRound className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{roleMetrics.totalRoles}</div>
            <p className="text-xs text-gray-500 mt-1">RBAC permission templates</p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Roles Distribution and Quick Links */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Roles & User Distribution</CardTitle>
                <CardDescription>Accounts assigned across defined system roles</CardDescription>
              </div>
              <Link href="/roles">
                <Button variant="outline" size="sm" className="gap-1 text-xs">
                  Manage Roles <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {roleMetrics.roles.map((role) => (
                <div key={role.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{role.name}</span>
                      {role.name === 'Administrator' && (
                        <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                          System Protected
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{role.description || 'No description provided'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">
                      {role.userCount} {role.userCount === 1 ? 'user' : 'users'}
                    </span>
                    <Link href={`/roles/${role.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Admin Actions & Safety Policies */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Security & Administrative Policies</CardTitle>
            <CardDescription>Core system protections and operational controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-800 font-medium text-sm">
                <ShieldCheck className="size-4 text-emerald-600" />
                Administrator Lockout Protection
              </div>
              <p className="text-xs text-emerald-700">
                Rules BR-ADMIN-001 through BR-ADMIN-003 strictly prevent deactivation, deletion, or role removal of the final active system Administrator.
              </p>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-blue-800 font-medium text-sm">
                <Shield className="size-4 text-blue-600" />
                Privilege Escalation Prevention
              </div>
              <p className="text-xs text-blue-700">
                Non-administrative users cannot grant themselves or others elevated roles. Self-escalation is blocked at the database transaction layer.
              </p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-gray-800 font-medium text-sm">
                <History className="size-4 text-gray-600" />
                Immutable Audit Logging
              </div>
              <p className="text-xs text-gray-600">
                All administrative changes (role assignments, status changes, password resets) are logged atomically and cannot be modified or deleted.
              </p>
            </div>
          </CardContent>
          <div className="p-6 pt-0 flex gap-2">
            <Link href="/users" className="flex-1">
              <Button className="w-full text-xs" variant="default">
                <Users className="size-3.5 mr-1.5" /> Manage Users
              </Button>
            </Link>
            <Link href="/audit-logs" className="flex-1">
              <Button className="w-full text-xs" variant="outline">
                <History className="size-3.5 mr-1.5" /> View Audit Logs
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Bottom Section: Recent Security Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Recent Security & System Activity</CardTitle>
              <CardDescription>Last 15 administrative mutations and authentication events</CardDescription>
            </div>
            <Link href="/audit-logs">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Full Audit Trail <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {securityActivity.recentEvents.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No recent administrative events recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-gray-500 bg-gray-50/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Target Entity</th>
                    <th className="px-4 py-3 font-medium">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {securityActivity.recentEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3 text-gray-400" />
                          {format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          variant="secondary"
                          className={`text-xs font-mono ${
                            event.action.includes('DEACTIVATE') || event.action.includes('DELETE')
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : event.action.includes('ACTIVAT') || event.action.includes('CREATE')
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : event.action.includes('PASSWORD') || event.action.includes('ROLE')
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {event.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <div className="font-medium text-gray-900">{event.actor}</div>
                        <div className="text-[11px] text-gray-500">@{event.actorUsername} ({event.actorRole})</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                        {event.entity} {event.entityId ? `#${event.entityId}` : ''}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">
                        {event.ipAddress || 'unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
