'use client';

import React, { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';

interface PartReportViewProps {
  data: {
    parts: Array<{
      partId: number;
      sku: string;
      name: string;
      categoryName: string;
      currentStock: number;
      importedQuantity: number;
      exportedQuantity: number;
      totalMovement: number;
      qcChecksCount: number;
      defectiveQuantity: number;
      defectRate: number;
      discrepancyCount: number;
    }>;
  };
}

export function PartReportView({ data }: PartReportViewProps) {
  const [sortKey, setSortKey] = useState<'movement' | 'stock' | 'defectRate' | 'exported' | 'imported'>('movement');

  const sortedParts = [...data.parts].sort((a, b) => {
    switch (sortKey) {
      case 'stock':
        return a.currentStock - b.currentStock; // lowest stock first
      case 'defectRate':
        return b.defectRate - a.defectRate; // highest defect rate first
      case 'exported':
        return b.exportedQuantity - a.exportedQuantity;
      case 'imported':
        return b.importedQuantity - a.importedQuantity;
      case 'movement':
      default:
        return b.totalMovement - a.totalMovement;
    }
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Part Throughput & Performance Matrix</h3>
            <p className="text-xs text-gray-500">Comprehensive inventory movement, QC defects, and count accuracy</p>
          </div>

          {/* Sort Controller */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
              <ArrowUpDown className="size-3" /> Sort by:
            </span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as any)}
              className="h-8 rounded-md border border-gray-300 bg-white px-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="movement">Highest Total Movement</option>
              <option value="stock">Lowest Stock Level</option>
              <option value="defectRate">Highest Defect Rate</option>
              <option value="exported">Highest Export Quantity</option>
              <option value="imported">Highest Import Quantity</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b">
              <tr>
                <th className="px-6 py-3">Part Details</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3 text-right">Current Stock</th>
                <th className="px-6 py-3 text-right">Imported</th>
                <th className="px-6 py-3 text-right">Exported</th>
                <th className="px-6 py-3 text-right font-bold text-gray-900">Total Movement</th>
                <th className="px-6 py-3 text-right">QC Defect Rate</th>
                <th className="px-6 py-3 text-right">Audit Discrepancies</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedParts.length > 0 ? (
                sortedParts.map((p) => (
                  <tr key={p.partId} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{p.sku}</div>
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">{p.categoryName}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                      {p.currentStock.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right text-emerald-600 font-medium">
                      +{p.importedQuantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right text-blue-600 font-medium">
                      -{p.exportedQuantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                      {p.totalMovement.toLocaleString()} pcs
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {p.qcChecksCount > 0 ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            p.defectRate > 10
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : p.defectRate > 0
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {p.defectRate}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {p.discrepancyCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700">
                          {p.discrepancyCount} flags
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">0</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                    No parts match the selected criteria.
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
