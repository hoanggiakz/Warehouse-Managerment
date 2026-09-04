'use client';

import React from 'react';

interface MetricProgressBarProps {
  value: number; // 0 to 100
  label?: string;
  sublabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  showPercentage?: boolean;
}

export function MetricProgressBar({
  value,
  label,
  sublabel,
  variant = 'primary',
  showPercentage = true,
}: MetricProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const variantColors = {
    default: 'bg-gray-500',
    primary: 'bg-blue-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-500',
    danger: 'bg-rose-600',
  };

  return (
    <div className="w-full space-y-1.5">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs font-medium text-gray-700">
          <span>{label}</span>
          {showPercentage && (
            <span className="font-semibold text-gray-900">{clampedValue.toFixed(1)}%</span>
          )}
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${variantColors[variant]}`}
          style={{ width: `${clampedValue}%` }}
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {sublabel && <p className="text-[11px] text-gray-500">{sublabel}</p>}
    </div>
  );
}
