'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface ReportKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  badge?: string;
}

export function ReportKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  badge,
}: ReportKpiCardProps) {
  const variantStyles = {
    default: {
      border: 'border-gray-200',
      icon: 'text-gray-600 bg-gray-50',
      value: 'text-gray-900',
    },
    success: {
      border: 'border-emerald-200',
      icon: 'text-emerald-600 bg-emerald-50',
      value: 'text-emerald-700',
    },
    warning: {
      border: 'border-amber-200',
      icon: 'text-amber-600 bg-amber-50',
      value: 'text-amber-700',
    },
    danger: {
      border: 'border-rose-200',
      icon: 'text-rose-600 bg-rose-50',
      value: 'text-rose-700',
    },
    info: {
      border: 'border-blue-200',
      icon: 'text-blue-600 bg-blue-50',
      value: 'text-blue-700',
    },
  };

  const style = variantStyles[variant];

  return (
    <Card className={`transition-all duration-200 hover:shadow-sm ${style.border}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </CardTitle>
        <div className={`rounded-md p-2 ${style.icon}`}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className={`text-2xl font-bold tracking-tight ${style.value}`}>
            {value}
          </div>
          {badge && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-800">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-gray-500 line-clamp-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
