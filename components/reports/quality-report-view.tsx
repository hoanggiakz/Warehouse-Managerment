'use client';

import React from 'react';
import { ReportKpiCard } from './report-kpi-card';
import { DistributionBar } from './visualizations/distribution-bar';
import { ShieldCheck, CheckCircle, AlertOctagon, XCircle, Wrench } from 'lucide-react';

interface QualityReportViewProps {
  data: {
    dateRangeLabel: string;
    totalInspections: number;
    draftCount: number;
    inProgressCount: number;
    completedCount: number;
    cancelledCount: number;
    passedCount: number;
    partiallyPassedCount: number;
    failedCount: number;
    inspectedQuantity: number;
    passedQuantity: number;
    defectiveQuantity: number;
    passRate: number;
    defectRate: number;
    severityDistribution: Array<{
      severity: string;
      count: number;
      failedQuantity: number;
    }>;
    dispositionDistribution: Array<{
      action: string;
      count: number;
      failedQuantity: number;
    }>;
    topDefectiveParts: Array<{
      partId: number;
      sku: string;
      partName: string;
      inspectedQuantity: number;
      defectiveQuantity: number;
      defectRate: number;
    }>;
  };
}

export function QualityReportView({ data }: QualityReportViewProps) {
  const severityColors: Record<string, string> = {
    NONE: 'bg-emerald-500',
    MINOR: 'bg-blue-500',
    MODERATE: 'bg-amber-400',
    MAJOR: 'bg-amber-600',
    CRITICAL: 'bg-rose-600',
  };

  const dispositionColors: Record<string, string> = {
    PASS: 'bg-emerald-500',
    ACCEPT: 'bg-emerald-400',
    QUARANTINE: 'bg-amber-500',
    REWORK: 'bg-purple-500',
    RETURN_TO_SUPPLIER: 'bg-blue-500',
    RETURN: 'bg-blue-400',
    SCRAP: 'bg-rose-600',
    DISPOSE: 'bg-rose-700',
  };

  const severitySegments = data.severityDistribution.map((s) => ({
    label: s.severity,
    value: s.count,
    color: severityColors[s.severity] || 'bg-gray-400',
  }));

  const dispositionSegments = data.dispositionDistribution.map((d) => ({
    label: d.action,
    value: d.count,
    color: dispositionColors[d.action] || 'bg-gray-400',
  }));

  return (
    <div className="space-y-6">
      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpiCard
          title="Overall Pass Rate"
          value={`${data.passRate}%`}
          subtitle={`${data.passedQuantity.toLocaleString()} / ${data.inspectedQuantity.toLocaleString()} units`}
          icon={CheckCircle}
          variant={data.passRate >= 90 ? 'success' : data.passRate >= 75 ? 'warning' : 'danger'}
        />
        <ReportKpiCard
          title="Defect Rate"
          value={`${data.defectRate}%`}
          subtitle={`${data.defectiveQuantity.toLocaleString()} rejected units`}
          icon={AlertOctagon}
          variant={data.defectRate === 0 ? 'success' : data.defectRate <= 5 ? 'warning' : 'danger'}
        />
        <ReportKpiCard
          title="Evaluated Inspections"
          value={data.completedCount}
          subtitle={`${data.passedCount} Passed, ${data.partiallyPassedCount} Partial, ${data.failedCount} Failed`}
          icon={ShieldCheck}
          variant="default"
        />
        <ReportKpiCard
          title="Defective Scrap & Quarantine"
          value={`${data.defectiveQuantity.toLocaleString()} pcs`}
          subtitle="Total rejected parts identified"
          icon={XCircle}
          variant={data.defectiveQuantity > 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Defect Severity Classification</h3>
          <DistributionBar segments={severitySegments} totalValue={data.totalInspections} />
        </div>

        {/* Action / Disposition Distribution */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Post-Inspection Disposition Routing</h3>
          <DistributionBar segments={dispositionSegments} totalValue={data.totalInspections} />
        </div>
      </div>

      {/* Top Defective Parts Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-base font-semibold text-gray-900">Highest Defect Rate Components</h3>
          <p className="text-xs text-gray-500">Automotive parts requiring quality supplier review or engineering inspection</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b">
              <tr>
                <th className="px-6 py-3">Part Details</th>
                <th className="px-6 py-3 text-right">Units Inspected</th>
                <th className="px-6 py-3 text-right">Defective Units</th>
                <th className="px-6 py-3 text-right">Defect Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.topDefectiveParts.length > 0 ? (
                data.topDefectiveParts.map((p) => (
                  <tr key={p.partId} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-gray-900">{p.partName}</div>
                      <div className="text-xs text-gray-400 font-mono">{p.sku}</div>
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-gray-700">
                      {p.inspectedQuantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-rose-600">
                      {p.defectiveQuantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          p.defectRate > 20
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : p.defectRate > 5
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {p.defectRate}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                    No defective parts reported for this time period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
