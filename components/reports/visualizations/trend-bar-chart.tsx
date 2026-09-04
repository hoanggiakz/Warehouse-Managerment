'use client';

import React from 'react';

export interface TrendDataPoint {
  label: string;
  inbound: number;
  outbound: number;
}

interface TrendBarChartProps {
  data: TrendDataPoint[];
  title?: string;
  subtitle?: string;
}

export function TrendBarChart({ data, title, subtitle }: TrendBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed p-6 text-sm text-gray-500">
        No trend data available for this time period.
      </div>
    );
  }

  // Determine highest value for scaling
  const maxVal = Math.max(
    1,
    ...data.map((d) => Math.max(d.inbound, d.outbound))
  );

  return (
    <div className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-emerald-500" />
            <span className="text-gray-700">Inbound (Imports)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-blue-500" />
            <span className="text-gray-700">Outbound (Exports)</span>
          </div>
        </div>
      </div>

      <div className="pt-4">
        {/* Bars Container */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 pb-2 border-b border-gray-100">
          {data.map((item, idx) => {
            const inboundHeight = Math.round((item.inbound / maxVal) * 100);
            const outboundHeight = Math.round((item.outbound / maxVal) * 100);

            return (
              <div key={idx} className="flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                  <div>In: {item.inbound.toLocaleString()} pcs</div>
                  <div>Out: {item.outbound.toLocaleString()} pcs</div>
                </div>

                <div className="flex items-end gap-1 sm:gap-1.5 w-full justify-center h-full">
                  {/* Inbound Bar */}
                  <div className="w-3 sm:w-5 flex flex-col justify-end items-center h-full">
                    <span className="text-[9px] font-medium text-emerald-700 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.inbound > 0 ? item.inbound : ''}
                    </span>
                    <div
                      style={{ height: `${Math.max(4, inboundHeight)}%` }}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t transition-all duration-300"
                    />
                  </div>

                  {/* Outbound Bar */}
                  <div className="w-3 sm:w-5 flex flex-col justify-end items-center h-full">
                    <span className="text-[9px] font-medium text-blue-700 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.outbound > 0 ? item.outbound : ''}
                    </span>
                    <div
                      style={{ height: `${Math.max(4, outboundHeight)}%` }}
                      className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Labels */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-2 text-center text-[11px] text-gray-500">
          {data.map((item, idx) => (
            <div key={idx} className="truncate font-medium">
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
