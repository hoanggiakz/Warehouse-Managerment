'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { DateRangePreset } from '@/lib/validations/reports';
import { ReportFilters } from '@/components/reports/report-filters';
import { InventoryReportView } from '@/components/reports/inventory-report-view';
import { StockStatusReportView } from '@/components/reports/stock-status-report-view';
import { MovementReportView } from '@/components/reports/movement-report-view';
import { ImportReportView } from '@/components/reports/import-report-view';
import { ExportReportView } from '@/components/reports/export-report-view';
import { StockCheckReportView } from '@/components/reports/stock-check-report-view';
import { QualityReportView } from '@/components/reports/quality-report-view';
import { SupplierReportView } from '@/components/reports/supplier-report-view';
import { PartReportView } from '@/components/reports/part-report-view';
import { WarehouseReportView } from '@/components/reports/warehouse-report-view';
import {
  getInventoryOverviewReport,
  getStockStatusReport,
  getInventoryMovementReport,
  getImportAnalyticsReport,
  getExportAnalyticsReport,
  getStockCheckAnalyticsReport,
  getQualityControlAnalyticsReport,
  getSupplierPerformanceReport,
  getPartPerformanceReport,
  getWarehousePerformanceReport,
  exportReportDataCsv,
} from '@/app/actions/reports';
import { PERMISSIONS, hasPermission } from '@/lib/rbac/permissions';
import {
  Boxes,
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  ShieldCheck,
  Truck,
  Layers,
  Building2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReportsClientProps {
  warehouses: Array<{ id: number; name: string; code: string }>;
  categories: Array<{ id: number; name: string }>;
  canExport: boolean;
  userPermissions: string[];
}

type TabType =
  | 'overview'
  | 'status'
  | 'movement'
  | 'imports'
  | 'exports'
  | 'stock-checks'
  | 'quality'
  | 'suppliers'
  | 'parts'
  | 'warehouses';

export function ReportsClient({
  warehouses,
  categories,
  canExport,
  userPermissions,
}: ReportsClientProps) {
  // Determine accessible tabs
  const tabs: Array<{ id: TabType; label: string; icon: any; permission?: string }> = [
    { id: 'overview', label: 'Inventory Overview', icon: Boxes, permission: PERMISSIONS.REPORT_INVENTORY },
    { id: 'status', label: 'Stock Health', icon: Activity, permission: PERMISSIONS.REPORT_INVENTORY },
    { id: 'movement', label: 'Movements', icon: Layers, permission: PERMISSIONS.REPORT_INVENTORY },
    { id: 'imports', label: 'Inbound Imports', icon: ArrowDownLeft, permission: PERMISSIONS.REPORT_IMPORT },
    { id: 'exports', label: 'Outbound Exports', icon: ArrowUpRight, permission: PERMISSIONS.REPORT_EXPORT },
    { id: 'stock-checks', label: 'Stock Audits', icon: ClipboardCheck, permission: PERMISSIONS.REPORT_STOCK_CHECK },
    { id: 'quality', label: 'Quality Control', icon: ShieldCheck, permission: PERMISSIONS.REPORT_QUALITY },
    { id: 'suppliers', label: 'Suppliers', icon: Truck, permission: PERMISSIONS.REPORT_SUPPLIER },
    { id: 'parts', label: 'Part Throughput', icon: Layers, permission: PERMISSIONS.REPORT_PART },
    { id: 'warehouses', label: 'Warehouses', icon: Building2, permission: PERMISSIONS.REPORT_WAREHOUSE },
  ];

  const accessibleTabs = tabs.filter((t) => !t.permission || hasPermission(userPermissions, t.permission));
  const [activeTab, setActiveTab] = useState<TabType>(accessibleTabs[0]?.id || 'overview');

  // Filter States
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);

  // Data & Loading States
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fetchCurrentReport = useCallback(() => {
    setLoading(true);
    setError(null);

    const filterParams = {
      datePreset,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      warehouseId,
      categoryId,
    };

    startTransition(async () => {
      try {
        let res: any = null;
        switch (activeTab) {
          case 'overview':
            res = await getInventoryOverviewReport(filterParams);
            break;
          case 'status':
            res = await getStockStatusReport(filterParams);
            break;
          case 'movement':
            res = await getInventoryMovementReport(filterParams);
            break;
          case 'imports':
            res = await getImportAnalyticsReport(filterParams);
            break;
          case 'exports':
            res = await getExportAnalyticsReport(filterParams);
            break;
          case 'stock-checks':
            res = await getStockCheckAnalyticsReport(filterParams);
            break;
          case 'quality':
            res = await getQualityControlAnalyticsReport(filterParams);
            break;
          case 'suppliers':
            res = await getSupplierPerformanceReport(filterParams);
            break;
          case 'parts':
            res = await getPartPerformanceReport(filterParams);
            break;
          case 'warehouses':
            res = await getWarehousePerformanceReport(filterParams);
            break;
          default:
            res = await getInventoryOverviewReport(filterParams);
        }
        setReportData(res);
      } catch (err: any) {
        console.error('Failed to load report:', err);
        setError(err.message || 'Unable to load report.');
      } finally {
        setLoading(false);
      }
    });
  }, [activeTab, datePreset, startDate, endDate, warehouseId, categoryId]);

  useEffect(() => {
    fetchCurrentReport();
  }, [fetchCurrentReport]);

  const handleResetFilters = () => {
    setDatePreset('30days');
    setStartDate('');
    setEndDate('');
    setWarehouseId(undefined);
    setCategoryId(undefined);
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const reportTypeMap: Record<TabType, string> = {
        overview: 'inventory',
        status: 'inventory',
        movement: 'movement',
        imports: 'imports',
        exports: 'exports',
        'stock-checks': 'stock-checks',
        quality: 'quality',
        suppliers: 'imports',
        parts: 'inventory',
        warehouses: 'inventory',
      };

      const csvContent = await exportReportDataCsv(reportTypeMap[activeTab], {
        datePreset,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        warehouseId,
        categoryId,
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `maluzen_${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('CSV report exported successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export CSV report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-2 overflow-x-auto pb-1" aria-label="Tabs">
          {accessibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Icon className={`size-4 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Shared Filter Bar */}
      <ReportFilters
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        warehouseId={warehouseId}
        onWarehouseChange={setWarehouseId}
        warehouses={warehouses}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        categories={categories}
        onReset={handleResetFilters}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
        canExport={canExport}
        activeTabName={accessibleTabs.find((t) => t.id === activeTab)?.label}
      />

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-white p-16 shadow-sm">
          <Loader2 className="size-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium text-gray-700">Aggregating transactional analytics...</p>
          <p className="text-xs text-gray-400 mt-1">Executing safe server-side queries</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-8 text-center shadow-sm">
          <AlertCircle className="size-8 text-rose-600 mx-auto mb-2" />
          <h4 className="text-base font-semibold text-rose-900">Error Loading Report</h4>
          <p className="text-sm text-rose-700 mt-1">{error}</p>
        </div>
      ) : reportData ? (
        <div>
          {activeTab === 'overview' && <InventoryReportView data={reportData} />}
          {activeTab === 'status' && <StockStatusReportView data={reportData} />}
          {activeTab === 'movement' && <MovementReportView data={reportData} />}
          {activeTab === 'imports' && <ImportReportView data={reportData} />}
          {activeTab === 'exports' && <ExportReportView data={reportData} />}
          {activeTab === 'stock-checks' && <StockCheckReportView data={reportData} />}
          {activeTab === 'quality' && <QualityReportView data={reportData} />}
          {activeTab === 'suppliers' && <SupplierReportView data={reportData} />}
          {activeTab === 'parts' && <PartReportView data={reportData} />}
          {activeTab === 'warehouses' && <WarehouseReportView data={reportData} />}
        </div>
      ) : (
        <div className="rounded-xl border bg-white p-12 text-center text-sm text-gray-500">
          No data available for the selected filters.
        </div>
      )}
    </div>
  );
}
