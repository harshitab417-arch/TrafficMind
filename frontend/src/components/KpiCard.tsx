import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  color?: 'blue' | 'teal' | 'red' | 'amber' | 'green';
}

const colorStyles = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-100',
  },
  teal: {
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-100',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-100',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-100',
  },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue',
}) => {
  const style = colorStyles[color];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </span>
        <div className={`p-2.5 rounded-lg ${style.bg} ${style.text} flex items-center justify-center`}>
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <div className="text-2xl font-bold text-gray-900 tracking-tight">
          {value}
        </div>
        {trend && (
          <div
            className={`flex items-center text-xs font-semibold ${
              trend.positive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend.positive ? (
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
            )}
            <span>{trend.value}%</span>
          </div>
        )}
      </div>

      {subtitle && (
        <div className="mt-1.5 text-xs text-gray-500 line-clamp-1">
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default KpiCard;
