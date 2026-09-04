'use client';

import React from 'react';

export interface DistributionSegment {
  label: string;
  value: number;
  color: string;
}

interface DistributionBarProps {
  segments: DistributionSegment[];
  totalValue?: number;
  title?: string;
  showLegend?: boolean;
}

export function DistributionBar({
  segments,
  totalValue,
  title,
  showLegend = true,
}: DistributionBarProps) {
  const calculatedTotal = totalValue ?? segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="w-full space-y-2.5">
      {title && (
        <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
          <span>{title}</span>
          <span className="text-gray-500">Total: {calculatedTotal.toLocaleString()}</span>
        </div>
      )}

      {/* Stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        {calculatedTotal > 0 ? (
          segments.map((seg, idx) => {
            const percentage = (seg.value / calculatedTotal) * 100;
            if (percentage <= 0) return null;
            return (
              <div
                key={idx}
                className={`h-full transition-all duration-300 ${seg.color}`}
                style={{ width: `${percentage}%` }}
                title={`${seg.label}: ${seg.value} (${percentage.toFixed(1)}%)`}
              />
            );
          })
        ) : (
          <div className="h-full w-full bg-gray-200" title="No data" />
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs">
          {segments.map((seg, idx) => {
            const percentage = calculatedTotal > 0 ? (seg.value / calculatedTotal) * 100 : 0;
            return (
              <div key={idx} className="flex items-center gap-1.5">
                <span className={`inline-block size-2.5 rounded-full ${seg.color}`} />
                <span className="text-gray-600 font-medium">{seg.label}:</span>
                <span className="text-gray-900 font-semibold">
                  {seg.value.toLocaleString()} ({percentage.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
