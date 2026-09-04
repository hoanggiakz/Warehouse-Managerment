'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReportKpiCard } from '@/components/reports/report-kpi-card';
import { MetricProgressBar } from '@/components/reports/visualizations/metric-progress-bar';
import { TrendBarChart } from '@/components/reports/visualizations/trend-bar-chart';
import { formatCurrency } from '@/lib/validations/reports';
import {
  Boxes,
  Building2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  Layers,
} from 'lucide-react';

interface DashboardMetricsData {
  inventory: {
    totalStockQuantity: number;
    totalParts: number;
    normalStockCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    overStockCount: number;
  };
  warehouse: {
    totalWarehouses: number;
    activeWarehouses: number;
    totalOccupancy: number;
    totalCapacity: number;
    overallUtilization: number;
  };
  inbound: {
    todayImportsCount: number;
    monthlyImportsCount: number;
    monthlyImportQuantity: number;
    monthlyImportValue: number;
  };
  outbound: {
    todayExportsCount: number;
    monthlyExportsCount: number;
    monthlyExportQuantity: number;
    monthlyExportValue: number;
  };
  quality: {
    pendingQCChecks: number;
    passedQCCount: number;
    failedQCChecks: number;
    defectiveQuantityTotal: number;
    inspectedQuantityTotal: number;
    qcPassRate: number;
  };
  stockCheck: {
    pendingStockChecks: number;
    discrepancyCount: number;
    adjustedStockChecks: number;
  };
  trendDays: Array<{
    date: string;
    label: string;
    inbound: number;
    outbound: number;
  }>;
  recentAuditLogs: Array<{
    id: number;
    action: string;
    entity: string;
    entityId: string | null;
    timestamp: string;
    userName: string;
  }>;
}

interface DashboardClientProps {
  metrics: DashboardMetricsData;
  userName: string;
}

export function DashboardClient({ metrics, userName }: DashboardClientProps) {
  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Link to Reports */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Operational Dashboard</h2>
          <p className="text-sm text-gray-500">
            Welcome back, {userName}. Live metrics across inventory, throughput, quality, and audits.
          </p>
        </div>
        <Link href="/reports">
          <Button className="font-semibold shadow-sm">
            <BarChart3 className="size-4 mr-2" />
            Full Reports & Analytics
          </Button>
        </Link>
      </div>

      {/* 1. Inventory & Warehouse Utilization Row */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
          <Boxes className="size-3.5" /> Inventory & Storage Health
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportKpiCard
            title="Total Stock On Hand"
            value={`${metrics.inventory.totalStockQuantity.toLocaleString()} pcs`}
            subtitle={`${metrics.inventory.totalParts} active catalog parts`}
            icon={Boxes}
            variant="default"
          />
          <ReportKpiCard
            title="Low Stock Alerts"
            value={metrics.inventory.lowStockCount}
            subtitle="At or below safety buffer"
            icon={AlertTriangle}
            variant={metrics.inventory.lowStockCount > 0 ? 'warning' : 'success'}
          />
          <ReportKpiCard
            title="Out of Stock"
            value={metrics.inventory.outOfStockCount}
            subtitle="Requires immediate reorder"
            icon={AlertCircle}
            variant={metrics.inventory.outOfStockCount > 0 ? 'danger' : 'success'}
          />
          <ReportKpiCard
            title="Warehouse Utilization"
            value={`${metrics.warehouse.overallUtilization}%`}
            subtitle={`${metrics.warehouse.totalOccupancy.toLocaleString()} / ${metrics.warehouse.totalCapacity.toLocaleString()} max capacity`}
            icon={Building2}
            variant={metrics.warehouse.overallUtilization > 85 ? 'warning' : 'info'}
          />
        </div>
      </div>

      {/* 2. Inbound & Outbound Operational KPIs */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
          <TrendingUp className="size-3.5" /> Throughput (Inbound & Outbound)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportKpiCard
            title="Today's Imports"
            value={metrics.inbound.todayImportsCount}
            subtitle={`This Month: ${metrics.inbound.monthlyImportsCount} receipts`}
            icon={ArrowDownLeft}
            variant="success"
          />
          <ReportKpiCard
            title="Monthly Inbound Volume"
            value={`${metrics.inbound.monthlyImportQuantity.toLocaleString()} pcs`}
            subtitle={`Spend: ${formatCurrency(metrics.inbound.monthlyImportValue)}`}
            icon={ArrowDownLeft}
            variant="success"
          />
          <ReportKpiCard
            title="Today's Exports"
            value={metrics.outbound.todayExportsCount}
            subtitle={`This Month: ${metrics.outbound.monthlyExportsCount} orders`}
            icon={ArrowUpRight}
            variant="info"
          />
          <ReportKpiCard
            title="Monthly Outbound Volume"
            value={`${metrics.outbound.monthlyExportQuantity.toLocaleString()} pcs`}
            subtitle={`Fulfilled: ${formatCurrency(metrics.outbound.monthlyExportValue)}`}
            icon={ArrowUpRight}
            variant="info"
          />
        </div>
      </div>

      {/* 3. Quality & Stock Check Verification */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
          <ShieldCheck className="size-3.5" /> Quality Assurance & Stock Audits
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportKpiCard
            title="QC Pass Rate"
            value={`${metrics.quality.qcPassRate}%`}
            subtitle={`${metrics.quality.passedQCCount} passed, ${metrics.quality.failedQCChecks} failed`}
            icon={ShieldCheck}
            variant={metrics.quality.qcPassRate >= 90 ? 'success' : 'warning'}
          />
          <ReportKpiCard
            title="Defective Parts"
            value={`${metrics.quality.defectiveQuantityTotal.toLocaleString()} pcs`}
            subtitle={`${metrics.quality.pendingQCChecks} inspections pending`}
            icon={XCircle}
            variant={metrics.quality.defectiveQuantityTotal > 0 ? 'danger' : 'success'}
          />
          <ReportKpiCard
            title="Active Stock Audits"
            value={metrics.stockCheck.pendingStockChecks}
            subtitle="Counting sessions in progress"
            icon={ClipboardCheck}
            variant="default"
          />
          <ReportKpiCard
            title="Audit Discrepancies"
            value={metrics.stockCheck.discrepancyCount}
            subtitle={`${metrics.stockCheck.adjustedStockChecks} reconciled checks`}
            icon={AlertTriangle}
            variant={metrics.stockCheck.discrepancyCount > 0 ? 'warning' : 'success'}
          />
        </div>
      </div>

      {/* 4. 7-Day Trend Chart & Recent Activities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Bar Chart */}
        <div className="lg:col-span-2">
          <TrendBarChart
            data={metrics.trendDays}
            title="7-Day Operational Movement Trend"
            subtitle="Daily comparison of inbound units vs outbound dispatches"
          />
        </div>

        {/* Recent Operational Events Feed */}
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="size-4 text-gray-500" /> Recent Operational Events
            </h3>
            <span className="text-[11px] text-gray-400">Live Audit Trail</span>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {metrics.recentAuditLogs.length > 0 ? (
              metrics.recentAuditLogs.map((log) => {
                let badgeColor = 'bg-gray-100 text-gray-700';
                if (log.action.includes('CREATED') || log.action.includes('IMPORT')) {
                  badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                } else if (log.action.includes('EXPORT')) {
                  badgeColor = 'bg-blue-50 text-blue-700 border border-blue-200';
                } else if (log.action.includes('ADJUST') || log.action.includes('DEFECT')) {
                  badgeColor = 'bg-amber-50 text-amber-700 border border-amber-200';
                } else if (log.action.includes('CANCEL')) {
                  badgeColor = 'bg-rose-50 text-rose-700 border border-rose-200';
                }

                return (
                  <div key={log.id} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`inline-block px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold ${badgeColor}`}>
                        {log.action}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span className="truncate">{log.entity}: {log.entityId}</span>
                      <span className="text-gray-400 font-medium">{log.userName}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-6 text-center text-gray-400">No recent activity recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* 5. Quick Actions Preserved & Enhanced */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Quick Navigation & Management
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/reports">
            <Button className="h-9">
              <BarChart3 className="size-4 mr-2" />
              Reports & Analytics
            </Button>
          </Link>
          <Link href="/inventory">
            <Button variant="outline" className="h-9">
              <Boxes className="size-4 mr-2" />
              Manage Inventory
            </Button>
          </Link>
          <Link href="/imports">
            <Button variant="outline" className="h-9">
              <ArrowDownLeft className="size-4 mr-2 text-emerald-600" />
              Import Receipts
            </Button>
          </Link>
          <Link href="/exports">
            <Button variant="outline" className="h-9">
              <ArrowUpRight className="size-4 mr-2 text-blue-600" />
              Export Receipts
            </Button>
          </Link>
          <Link href="/stock-checks">
            <Button variant="outline" className="h-9">
              <ClipboardCheck className="size-4 mr-2 text-indigo-600" />
              Stock Audits
            </Button>
          </Link>
          <Link href="/quality-checks">
            <Button variant="outline" className="h-9">
              <ShieldCheck className="size-4 mr-2 text-primary" />
              Quality Checks
            </Button>
          </Link>
          <Link href="/warehouses">
            <Button variant="outline" className="h-9">
              <Building2 className="size-4 mr-2" />
              Warehouses
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
