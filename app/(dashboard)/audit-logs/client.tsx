'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  History,
  Search,
  Filter,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
  Calendar,
  Lock,
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLogsClientProps {
  initialData: {
    logs: Array<{
      id: number;
      userId: number | null;
      user: {
        id: number;
        username: string;
        fullName: string;
        role: {
          id: number;
          name: string;
        } | null;
      } | null;
      action: string;
      entity: string;
      entityId: string | null;
      metadata: any;
      ipAddress: string | null;
      timestamp: Date;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filterOptions: {
    actions: string[];
    entities: string[];
  };
  searchParams: {
    page: number;
    search: string;
    action: string;
    entity: string;
    startDate: string;
    endDate: string;
  };
}

export function AuditLogsClient({
  initialData,
  filterOptions,
  searchParams,
}: AuditLogsClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(searchParams.search);
  const [selectedAction, setSelectedAction] = useState(searchParams.action);
  const [selectedEntity, setSelectedEntity] = useState(searchParams.entity);
  const [startDate, setStartDate] = useState(searchParams.startDate);
  const [endDate, setEndDate] = useState(searchParams.endDate);

  const [activeMetadataModal, setActiveMetadataModal] = useState<{
    action: string;
    entity: string;
    entityId: string | null;
    metadata: any;
    timestamp: Date;
    actor: string;
  } | null>(null);

  const applyFilters = (newParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      page: 1,
      search,
      action: selectedAction,
      entity: selectedEntity,
      startDate,
      endDate,
      ...newParams,
    };

    if (merged.search) params.set('search', String(merged.search));
    if (merged.action) params.set('action', String(merged.action));
    if (merged.entity) params.set('entity', String(merged.entity));
    if (merged.startDate) params.set('startDate', String(merged.startDate));
    if (merged.endDate) params.set('endDate', String(merged.endDate));
    if (merged.page && Number(merged.page) > 1) params.set('page', String(merged.page));

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ page: 1 });
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedAction('');
    setSelectedEntity('');
    setStartDate('');
    setEndDate('');
    router.push(pathname);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Audit Logs & Compliance Trail</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Immutable log of all user activities, status mutations, role modifications, and inventory transactions.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
          <Lock className="size-3.5 text-gray-500" />
          Strictly Read-Only
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-2.5 size-4 text-gray-400" />
                <Input
                  placeholder="Search action, entity, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>

              <div>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All Actions</option>
                  {filterOptions.actions.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedEntity}
                  onChange={(e) => setSelectedEntity(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All Entities</option>
                  {filterOptions.entities.map((ent) => (
                    <option key={ent} value={ent}>
                      {ent}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs h-9"
                  title="Start Date"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs h-9"
                  title="End Date"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              {(search || selectedAction || selectedEntity || startDate || endDate) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 text-xs text-gray-500"
                >
                  Reset Filters
                </Button>
              )}
              <Button type="submit" size="sm" className="h-8 text-xs gap-1">
                <Filter className="size-3" /> Apply Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-gray-500 bg-gray-50/50">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Timestamp</th>
                  <th className="px-5 py-3.5 font-medium">Actor</th>
                  <th className="px-5 py-3.5 font-medium">Action</th>
                  <th className="px-5 py-3.5 font-medium">Target Entity</th>
                  <th className="px-5 py-3.5 font-medium">IP Address</th>
                  <th className="px-5 py-3.5 font-medium text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialData.logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">
                      No audit log entries found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  initialData.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3.5 text-gray-400" />
                          {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {log.user ? (
                          <div>
                            <div className="font-semibold text-gray-900 text-xs">{log.user.fullName}</div>
                            <div className="text-[11px] text-gray-500">
                              @{log.user.username} {log.user.role ? `(${log.user.role.name})` : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">System Actor</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Badge
                          variant="secondary"
                          className={`text-xs font-mono ${
                            log.action.includes('DEACTIVATE') || log.action.includes('DELETE') || log.action.includes('CANCEL')
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : log.action.includes('ACTIVAT') || log.action.includes('CREATE') || log.action.includes('SUCCESS')
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : log.action.includes('PASSWORD') || log.action.includes('ROLE')
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                        <span className="font-medium text-gray-900">{log.entity}</span>
                        {log.entityId && (
                          <span className="text-gray-500 ml-1">#{log.entityId}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 font-mono whitespace-nowrap">
                        {log.ipAddress || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {log.metadata ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setActiveMetadataModal({
                                action: log.action,
                                entity: log.entity,
                                entityId: log.entityId,
                                metadata: log.metadata,
                                timestamp: log.timestamp,
                                actor: log.user ? `${log.user.fullName} (@${log.user.username})` : 'System',
                              })
                            }
                            className="h-7 text-xs px-2 gap-1 text-gray-600 hover:text-gray-900"
                          >
                            <Eye className="size-3.5" /> Payload
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
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
                Showing page {initialData.page} of {initialData.totalPages} ({initialData.total} total log records)
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

      {/* Metadata Detail Modal */}
      <Dialog
        open={activeMetadataModal !== null}
        onOpenChange={(open) => !open && setActiveMetadataModal(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <History className="size-4 text-primary" />
              Audit Event Payload: {activeMetadataModal?.action}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {activeMetadataModal?.actor} • {activeMetadataModal && format(new Date(activeMetadataModal.timestamp), 'yyyy-MM-dd HH:mm:ss')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-2.5 rounded-md">
              <span>
                Entity: <strong>{activeMetadataModal?.entity}</strong>
              </span>
              <span>
                ID: <strong>#{activeMetadataModal?.entityId || 'N/A'}</strong>
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-700">Metadata Payload (Sanitized):</span>
              <pre className="p-3 bg-gray-900 text-gray-100 rounded-md text-xs overflow-x-auto font-mono max-h-72">
                {JSON.stringify(activeMetadataModal?.metadata, null, 2)}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveMetadataModal(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
