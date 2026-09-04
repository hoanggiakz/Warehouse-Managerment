'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { DateRangePreset } from '@/lib/validations/reports';
import { Calendar, Download, RefreshCw, Filter } from 'lucide-react';

interface WarehouseOption {
  id: number;
  name: string;
  code: string;
}

interface CategoryOption {
  id: number;
  name: string;
}

interface ReportFiltersProps {
  datePreset: DateRangePreset;
  onDatePresetChange: (preset: DateRangePreset) => void;
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (val: string) => void;
  onEndDateChange?: (val: string) => void;
  warehouseId?: number;
  onWarehouseChange?: (id: number | undefined) => void;
  warehouses?: WarehouseOption[];
  categoryId?: number;
  onCategoryChange?: (id: number | undefined) => void;
  categories?: CategoryOption[];
  onReset?: () => void;
  onExportCsv?: () => void;
  isExporting?: boolean;
  canExport?: boolean;
  activeTabName?: string;
}

export function ReportFilters({
  datePreset,
  onDatePresetChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  warehouseId,
  onWarehouseChange,
  warehouses = [],
  categoryId,
  onCategoryChange,
  categories = [],
  onReset,
  onExportCsv,
  isExporting = false,
  canExport = false,
  activeTabName = 'Report',
}: ReportFiltersProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Filter className="size-4 text-primary" />
          <span>Filters & Range</span>
        </div>

        <div className="flex items-center gap-2">
          {onReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-xs text-gray-600 hover:text-gray-900 h-8"
            >
              <RefreshCw className="size-3.5 mr-1.5" />
              Reset Filters
            </Button>
          )}

          {canExport && onExportCsv && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCsv}
              disabled={isExporting}
              className="text-xs font-medium h-8 border-gray-300"
            >
              <Download className="size-3.5 mr-1.5 text-gray-600" />
              {isExporting ? 'Exporting...' : `Export CSV`}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Date Preset Selector */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
            <Calendar className="size-3 text-gray-400" />
            Time Horizon
          </label>
          <select
            value={datePreset}
            onChange={(e) => onDatePresetChange(e.target.value as DateRangePreset)}
            className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="this_month">Current Month</option>
            <option value="last_month">Previous Month</option>
            <option value="this_year">Current Year</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {/* Custom Start Date */}
        {datePreset === 'custom' && onStartDateChange && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Start Date</label>
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {/* Custom End Date */}
        {datePreset === 'custom' && onEndDateChange && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">End Date</label>
            <input
              type="date"
              value={endDate || ''}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {/* Warehouse Filter */}
        {onWarehouseChange && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Warehouse Location</label>
            <select
              value={warehouseId || ''}
              onChange={(e) => onWarehouseChange(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Category Filter */}
        {onCategoryChange && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Part Category</label>
            <select
              value={categoryId || ''}
              onChange={(e) => onCategoryChange(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
