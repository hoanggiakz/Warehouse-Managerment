'use client';

import React from 'react';
import { ReportKpiCard } from './report-kpi-card';
import { TrendBarChart } from './visualizations/trend-bar-chart';
import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';

interface MovementReportViewProps {
  data: {
    dateRangeLabel: string;
    totalInbound: number;
    totalOutbound: number;
    netMovement: number;
    rows: Array<{
      date: string;
      label: string;
      inbound: number;
      outbound: number;
      netMovement: number;
    }>;
  };
}

export function MovementReportView({ data }: MovementReportViewProps) {
  const chartData = data.rows.slice(-14).map((r) => ({
    label: r.label,
    inbound: r.inbound,
    outbound: r.outbound,
  }));

  return (
    <div className="space-y-6">
      {/* 3 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ReportKpiCard
          title="Total Inbound (Receipts)"
          value={`${data.totalInbound.toLocaleString()} pcs`}
          subtitle="Completed imports received"
          icon={ArrowDownLeft}
          variant="success"
        />
        <ReportKpiCard
          title="Total Outbound (Shipments)"
          value={`${data.totalOutbound.toLocaleString()} pcs`}
          subtitle="Completed exports dispatched"
          icon={ArrowUpRight}
          variant="info"
        />
        <ReportKpiCard
          title="Net Stock Delta"
          value={`${data.netMovement > 0 ? '+' : ''}${data.netMovement.toLocaleString()} pcs`}
          subtitle={data.netMovement >= 0 ? 'Net inventory growth' : 'Net inventory reduction'}
          icon={Scale}
          variant={data.netMovement >= 0 ? 'success' : 'warning'}
        />
      </div>

      {/* Visual Trend Chart */}
      {data.rows.length > 0 && (
        <TrendBarChart
          data={chartData}
          title={`Inventory Movement Timeline (${data.dateRangeLabel})`}
          subtitle="Direct comparison between inbound receipt volume and outbound dispatch volume"
        />
      )}

      {/* Movement Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-base font-semibold text-gray-900">Historical Movement Log</h3>
          <p className="text-xs text-gray-500">Date-by-date transactional audit of inward and outward units</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b">
              <tr>
                <th className="px-6 py-3">Time Interval</th>
                <th className="px-6 py-3 text-right text-emerald-700">Inbound (Pcs)</th>
                <th className="px-6 py-3 text-right text-blue-700">Outbound (Pcs)</th>
                <th className="px-6 py-3 text-right">Net Movement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.rows.length > 0 ? (
                data.rows.map((row) => (
                  <tr key={row.date} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-gray-900">
                      {row.label}
                      <span className="ml-2 text-xs font-mono text-gray-400">({row.date})</span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-semibold text-emerald-600">
                      +{row.inbound.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right font-semibold text-blue-600">
                      -{row.outbound.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold">
                      <span
                        className={
                          row.netMovement > 0
                            ? 'text-emerald-700'
                            : row.netMovement < 0
                            ? 'text-rose-600'
                            : 'text-gray-500'
                        }
                      >
                        {row.netMovement > 0 ? '+' : ''}
                        {row.netMovement.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                    No movement records found for the selected time horizon and filters.
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
